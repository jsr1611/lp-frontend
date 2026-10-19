import { FxPreset } from "./special-days";

// The one particle engine for every on-screen effect: milestone confetti, holiday
// lanterns, the late-arrival rain. Draws on a throwaway full-screen canvas.

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vr: number; color: string; life: number;
}

// Per-preset colours. Kept here rather than in CSS: they are drawn on a canvas.
const PALETTES: Record<FxPreset, string[]> = {
  confetti: ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1", "#20c997"],
  fireworks: ["#ffd43b", "#ff6b6b", "#74c0fc", "#b197fc", "#63e6be", "#ffa94d"],
  lanterns: ["#ff6b6b", "#fa5252", "#ffa94d", "#ffd43b"],
  moon: ["#ffe066", "#ffd43b", "#fff3bf"],
  crescent: ["#ffe066", "#fff9db", "#96f2d7"],
  balloons: ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#da77f2", "#ff922b"],
  late: ["#adb5bd", "#868e96", "#ced4da"],
};

/**
 * Play a preset for ms milliseconds. Returns a function that stops it early. Does
 * nothing under prefers-reduced-motion. Call outside Angular's zone: every frame
 * would otherwise trigger change detection.
 */
export function runParticles(preset: FxPreset, ms: number): () => void {
  let frame = 0;
  let canvas: HTMLCanvasElement | null = null;
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas?.remove();
    canvas = null;
  };
  if (typeof window === "undefined") return stop;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return stop;

  canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "1201",
  });
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return stop;
  ctx.scale(dpr, dpr);

  const colors = PALETTES[preset];
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const particles: Particle[] = [];
  const spawn = (p: Partial<Particle>) =>
    particles.push({ x: 0, y: 0, vx: 0, vy: 0, size: 6, rot: 0, vr: 0, color: pick(), life: 1, ...p });

  // Initial population; fireworks keep bursting while the effect lasts.
  const burst = (cx: number, cy: number) => {
    const color = pick();
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const s = rnd(2, 5.5);
      spawn({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 2.6, color });
    }
  };
  if (preset === "confetti") {
    for (let i = 0; i < 160; i++) {
      const left = i % 2 === 0;
      const a = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.8;
      const s = rnd(9, 18);
      spawn({ x: left ? 0 : w, y: h * 0.9, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
              size: rnd(6, 12), rot: Math.random() * 3, vr: rnd(-0.15, 0.15) });
    }
  } else if (preset === "lanterns" || preset === "balloons") {
    const n = preset === "balloons" ? 26 : 22;
    for (let i = 0; i < n; i++) {
      spawn({ x: rnd(0, w), y: h + rnd(20, h * 0.6), vx: rnd(-0.3, 0.3), vy: -rnd(1.6, 3.4),
              size: rnd(16, 30), rot: rnd(0, 6) });
    }
  } else if (preset === "moon" || preset === "crescent") {
    for (let i = 0; i < 90; i++) {
      spawn({ x: rnd(0, w), y: rnd(-h, 0), vx: rnd(-0.2, 0.2), vy: rnd(0.6, 1.8),
              size: rnd(1.5, 3.5), rot: rnd(0, 6) });
    }
  } else if (preset === "late") {
    for (let i = 0; i < 120; i++) {
      spawn({ x: rnd(0, w), y: rnd(-h, 0), vx: -1.2, vy: rnd(9, 14), size: rnd(10, 22) });
    }
  }

  const started = performance.now();
  let lastBurst = 0;
  const step = (now: number) => {
    const t = now - started;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, (ms - t) / 600));

    if (preset === "fireworks" && t - lastBurst > 380 && t < ms - 700) {
      lastBurst = t;
      burst(rnd(w * 0.15, w * 0.85), rnd(h * 0.12, h * 0.5));
    }

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr || 0.03;
      ctx.save();
      ctx.fillStyle = p.color;
      if (preset === "confetti") {
        p.vy += 0.25; p.vx *= 0.99;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (preset === "fireworks") {
        p.vy += 0.05; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012;
        ctx.globalAlpha *= Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (preset === "lanterns") {
        // A warm paper lantern: glow, body, and a dark cap.
        p.x += Math.sin(p.rot) * 0.4;
        ctx.shadowColor = p.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.6, p.size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "#5c2b0a";
        ctx.fillRect(p.x - p.size * 0.3, p.y - p.size * 0.85, p.size * 0.6, p.size * 0.15);
      } else if (preset === "balloons") {
        p.x += Math.sin(p.rot) * 0.6;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.moveTo(p.x, p.y + p.size); ctx.quadraticCurveTo(p.x - 6, p.y + p.size * 1.6, p.x, p.y + p.size * 2.2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.75, p.size, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath(); ctx.ellipse(p.x - p.size * 0.25, p.y - p.size * 0.35, p.size * 0.15, p.size * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
      } else if (preset === "moon" || preset === "crescent") {
        // Twinkling stars drifting down.
        ctx.globalAlpha *= 0.55 + 0.45 * Math.sin(p.rot * 3);
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (preset === "late") {
        // Grey rain streaks.
        ctx.strokeStyle = p.color; ctx.globalAlpha *= 0.6; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1.5, p.y + p.size); ctx.stroke();
        if (p.y > h) { p.y = -20; p.x = rnd(0, w); }
      }
      ctx.restore();
    }
    if (t < ms) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
  return stop;
}

