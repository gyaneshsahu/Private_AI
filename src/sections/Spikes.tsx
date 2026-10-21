import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

// A burst of light under the comparison: warm at the core, violet and pink at the tips.
// The spikes lean away from the pointer (your data keeps its distance), and a click sends a pulse outward.

const TIPS = ["#5b36f2", "#7c4dff", "#8b5cf6", "#c04bd8", "#f2509b", "#5a8dff"];
const CORE = [255, 181, 71];

type Spike = {
  angle: number;
  length: number;
  tip: string;
  rgb: number[];
  phase: number;
  speed: number;
  dx: number;
  dy: number;
};

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function makeSpikes(count: number): Spike[] {
  let seed = 1729;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, () => {
    const spread = rand();
    const tip = TIPS[Math.floor(rand() * TIPS.length)];
    return {
      // Fan across the upper half, denser toward the middle.
      angle: Math.PI + Math.PI * (0.04 + 0.92 * (0.5 + (spread - 0.5) * (0.6 + 0.4 * rand()))),
      length: 0.35 + 0.65 * Math.pow(rand(), 0.7),
      tip,
      rgb: hexToRgb(tip),
      phase: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 0.8,
      dx: 0,
      dy: 0,
    };
  });
}

export function Spikes() {
  const reduce = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const spikes = makeSpikes(360);
    const pointer = { x: -9999, y: -9999, active: false };
    let pulse = 0;
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      width = r.width;
      height = r.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const ox = width / 2;
      const oy = height + 6;
      const radius = Math.min(width * 0.46, height * 1.05);
      pulse *= 0.94;

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";

      for (const s of spikes) {
        const sway = reduce ? 0 : Math.sin(t * s.speed + s.phase) * 0.018;
        const breathe = reduce ? 1 : 1 + Math.sin(t * s.speed * 0.7 + s.phase) * 0.03 + pulse * 0.18;
        const a = s.angle + sway;
        const len = s.length * radius * breathe;
        let tx = ox + Math.cos(a) * len;
        let ty = oy + Math.sin(a) * len;

        let px = 0;
        let py = 0;
        if (pointer.active && !reduce) {
          const vx = tx - pointer.x;
          const vy = ty - pointer.y;
          const d = Math.hypot(vx, vy);
          if (d < 150 && d > 0.01) {
            const push = (1 - d / 150) ** 2 * 70;
            px = (vx / d) * push;
            py = (vy / d) * push;
          }
        }
        s.dx += (px - s.dx) * 0.14;
        s.dy += (py - s.dy) * 0.14;
        tx += s.dx;
        ty += s.dy;

        const grad = ctx.createLinearGradient(ox, oy, tx, ty);
        grad.addColorStop(0, `rgba(${CORE[0]},${CORE[1]},${CORE[2]},0.85)`);
        grad.addColorStop(0.45, "rgba(255,122,89,0.55)");
        grad.addColorStop(1, `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},0.95)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.fillStyle = s.tip;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) frame = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = () => {
      pulse = 1;
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    ro.observe(canvas);

    if (reduce) {
      draw(performance.now());
      return () => ro.disconnect();
    }

    // Only animate while the burst is on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        start = performance.now() - 1000;
        frame = requestAnimationFrame(draw);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    });
    io.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, [reduce]);

  return (
    <div className="spikes">
      <canvas ref={canvasRef} className="spikes-canvas" aria-hidden="true" />
      <p className="spikes-hint">
        {reduce ? "Your data keeps its distance." : "Try to reach in. Your data keeps its distance."}
      </p>
    </div>
  );
}
