import { ChangeDetectionStrategy, Component, Input, NgZone, OnDestroy, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Milestone, MilestoneKind } from "src/app/models/overtime";
import { SecureService } from "src/app/services/SercureService";
import { formatMoney, milestoneLabel } from "../milestone-label";
import { runParticles } from "../fx-particles";

// At most this many milestones in one celebration; the rest are marked seen quietly.
const MAX_SHOWN = 3;
// Bigger news first when several land together.
const KIND_ORDER: MilestoneKind[] = ["years", "days", "months", "earnings", "hours"];

const CONFETTI_MS = 3500;

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
  private readonly zone = inject(NgZone);

  @Input() company: string | undefined;
  @Input() set reached(list: Milestone[] | undefined) {
    this.consider(list || []);
  }

  shown: Milestone[] = [];
  // Ids already dealt with in this page load. The overview reloads after every save,
  // and until the "seen" post lands it would offer the same milestones again.
  private handled = new Set<string>();
  private pendingSeen: string[] = [];
  private stopFx: (() => void) | null = null;

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

  private launchConfetti(): void {
    this.stopConfetti();
    // Shared with the full-screen effects; outside the zone so frames skip change detection.
    this.stopFx = this.zone.runOutsideAngular(() => runParticles("confetti", CONFETTI_MS));
  }

  private stopConfetti(): void {
    this.stopFx?.();
    this.stopFx = null;
  }
}
