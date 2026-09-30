import { ChangeDetectionStrategy, Component, Input, OnDestroy, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Milestone, MilestoneKind } from "src/app/models/overtime";
import { SecureService } from "src/app/services/SercureService";
import { formatMoney, milestoneLabel } from "../milestone-label";

// At most this many milestones in one celebration; the rest are marked seen quietly.
const MAX_SHOWN = 3;
// Bigger news first when several land together.
const KIND_ORDER: MilestoneKind[] = ["years", "days", "months", "earnings", "hours"];

const CONFETTI_COUNT = 160;
const CONFETTI_MS = 3500;
const CONFETTI_COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1", "#20c997"];

interface Piece {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vr: number; color: string;
}

/**
 * The surprise on opening the page after reaching a milestone. Fed the overview's
 * reached milestones; any not yet seen are celebrated once, then posted back as seen so
 * they never fire again, on this device or another.
 */
@Component({
  selector: "app-milestone-celebration",
  templateUrl: "./milestone-celebration.component.html",
  styleUrls: ["./milestone-celebration.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class MilestoneCelebrationComponent implements OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly secureService = inject(SecureService);

  @Input() company: string | undefined;
  @Input() set reached(list: Milestone[] | undefined) {
    this.consider(list || []);
  }

  shown: Milestone[] = [];
  // Ids already dealt with in this page load. The overview reloads after every save,
  // and until the "seen" post lands it would offer the same milestones again.
  private handled = new Set<string>();
  private pendingSeen: string[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private frame = 0;

  ngOnDestroy(): void {
    this.stopConfetti();
  }

  label(m: Milestone): string {
    return milestoneLabel(this.translate, m);
  }

  // One line under the headline saying why it matters.
  detail(m: Milestone): string {
    if (m.kind === "years" && m.leaveDays) {
      return this.translate.instant("overtime.milestones.detail.yearsLeave", { leave: m.leaveDays });
    }
    if (m.kind === "earnings") {
      return this.translate.instant("overtime.milestones.detail.earnings", {
        value: formatMoney(this.translate, m.value, m.currency || "KRW"),
      });
    }
    return this.translate.instant(`overtime.milestones.detail.${m.kind}`, { value: m.value });
  }

  icon(m: Milestone): string {
    return { years: "bi-trophy", days: "bi-calendar-check", months: "bi-calendar-heart",
             hours: "bi-lightning-charge", earnings: "bi-cash-coin" }[m.kind];
  }

  close(): void {
    this.shown = [];
    this.stopConfetti();
    this.flushSeen();
  }

  private consider(list: Milestone[]): void {
    const fresh = list.filter((m) => !m.seen && !this.handled.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => this.handled.add(m.id));
    this.pendingSeen.push(...fresh.map((m) => m.id));

    const worthIt = fresh
      .filter((m) => m.celebrate)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.value - a.value);
    // Only the top milestone of each kind: "100h" and "250h" together says the same twice.
    const oneEach = worthIt.filter((m, i) => worthIt.findIndex((o) => o.kind === m.kind) === i);

    if (!oneEach.length) {
      // Old ones (a start date entered years back): record them without a fuss.
      this.flushSeen();
      return;
    }
    this.shown = oneEach.slice(0, MAX_SHOWN);
    this.launchConfetti();
  }

  private flushSeen(): void {
    if (!this.pendingSeen.length) return;
    const ids = this.pendingSeen;
    this.pendingSeen = [];
    // Best effort: failing here only means the celebration may show again next time.
    this.secureService.markMilestonesSeen(ids).subscribe({ error: () => {} });
  }

  // ---------- Confetti ----------

  private launchConfetti(): void {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    this.stopConfetti();

    const canvas = document.createElement("canvas");
    canvas.className = "milestone-confetti";
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "1100",
    });
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    document.body.appendChild(canvas);
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Two bursts from the lower corners, angled up and inward.
    const pieces: Piece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.8;
      const speed = 9 + Math.random() * 9;
      return {
        x: left ? 0 : w, y: h * 0.9,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      };
    });

    const started = performance.now();
    const step = (now: number) => {
      const t = now - started;
      ctx.clearRect(0, 0, w, h);
      // Fade out over the last second.
      ctx.globalAlpha = Math.max(0, Math.min(1, (CONFETTI_MS - t) / 1000));
      for (const p of pieces) {
        p.vy += 0.25;   // gravity
        p.vx *= 0.99;   // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (t < CONFETTI_MS) this.frame = requestAnimationFrame(step);
      else this.stopConfetti();
    };
    this.frame = requestAnimationFrame(step);
  }

  private stopConfetti(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.canvas?.remove();
    this.canvas = null;
  }
}
