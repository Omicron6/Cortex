import { useEffect, useRef } from "react";
import { ENTITY_NODES } from "@/lib/cortex-data";

export type CoreMode = "idle" | "thinking" | "listening" | "speaking" | "warning";

interface Props {
  /** Rendered size in CSS px (square). */
  size?: number;
  className?: string;
  /** Reduces label rendering for compact contexts. */
  compact?: boolean;
  /** Runtime state — drives ring colour, rotation and pulse behaviour. */
  mode?: CoreMode;
  /** Answer confidence band — tints the core cyan / amber / maroon. */
  confidence?: "high" | "medium" | "low";
}

/* CORTEX palette (rgb triplets for canvas alpha compositing) */
const GOLD = "184, 138, 42"; // #B88A2A authority brass — outer energy ring
const CYAN = "34, 199, 230"; // #22C7E6 intelligence — middle ring / graph
const STEEL = "24, 155, 183"; // #189BB7 graph edges
const KHAKI = "183, 161, 122"; // #B7A17A metadata labels
const MAROON = "140, 31, 40"; // #8C1F28 warning mode
const AMBER = "211, 154, 44"; // #D39A2C medium confidence
const WHITE = "255, 255, 255"; // inner core

/**
 * CORTEX Intelligence Core — the Crime Intelligence Runtime rendered as a live
 * canvas scene. Brass outer energy rings (KSP authority), cyan reasoning rings
 * and graph lattice, white inner core. Reacts to pointer, scroll and mode.
 */
export function IntelligenceCore({
  size = 520,
  className,
  compact = false,
  mode = "idle",
  confidence,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, hover: 0 });
  const scroll = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.24;
    const nodeCount = ENTITY_NODES.length;

    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      angle: (i / nodeCount) * Math.PI * 2,
      orbit: radius * (1.45 + (i % 3) * 0.26),
      speed: 0.0016 + (i % 4) * 0.0006,
      tilt: 0.32 + (i % 3) * 0.16,
      label: ENTITY_NODES[i],
      phase: i * 0.7,
      /* every fourth node is a priority / high-value target → brass */
      priority: i % 4 === 0,
    }));

    const warning = mode === "warning";
    const thinking = mode === "thinking";
    const listening = mode === "listening";
    const speaking = mode === "speaking";

    const conf =
      confidence === "low" ? MAROON : confidence === "medium" ? AMBER : confidence ? CYAN : null;
    const graph = warning ? MAROON : (conf ?? CYAN);
    const edge = warning ? MAROON : conf === AMBER ? AMBER : conf === MAROON ? MAROON : STEEL;
    const brass = warning ? MAROON : GOLD;
    const coreRim = warning ? MAROON : (conf ?? CYAN);

    let raf = 0;
    let t = 0;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onEnter = () => (pointer.current.hover = 1);
    const onLeave = () => {
      pointer.current.hover = 0;
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    const onScroll = () => {
      scroll.current = window.scrollY / 800;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    const draw = () => {
      t += 1;
      const p = pointer.current;
      const hover = p.hover;
      const sway = scroll.current * 0.35;
      const px = p.x * 12;
      const py = p.y * 12 + sway * 10;
      /* listening: soft cyan breathing. speaking: brighter white-cyan pulse. */
      const breath = listening
        ? 0.5 + Math.sin(t * 0.035) * 0.5
        : speaking
          ? 0.6 + Math.sin(t * 0.09) * 0.4
          : 0.5;

      ctx.clearRect(0, 0, size, size);

      /* OUTER ENERGY RINGS — authority brass, slow deliberate rotation */
      for (let r = 0; r < 3; r++) {
        const rr = radius * (1.95 + r * 0.4);
        const spin = thinking ? 0.0016 : 0.0008;
        ctx.save();
        ctx.translate(cx + px * 0.3, cy + py * 0.3);
        ctx.rotate(t * (spin + r * 0.0003) * (r % 2 === 0 ? 1 : -1) + sway);
        ctx.scale(1, 0.34 + r * 0.05);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${brass}, ${0.42 + hover * 0.2 - r * 0.09})`;
        ctx.lineWidth = r === 0 ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();

        /* brass rank ticks riding the outer ring */
        if (r === 0) {
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + t * spin;
            ctx.beginPath();
            ctx.arc(
              cx + px * 0.3 + Math.cos(a) * rr,
              cy + py * 0.3 + Math.sin(a) * rr * 0.34,
              1.1,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = `rgba(${brass}, ${0.7 + hover * 0.3})`;
            ctx.fill();
          }
        }
      }

      /* MIDDLE RINGS — intelligence cyan */
      for (let r = 0; r < 4; r++) {
        ctx.save();
        ctx.translate(cx + px * 0.6, cy + py * 0.6);
        ctx.rotate(t * (0.0035 + r * 0.0014) * (r % 2 === 0 ? 1 : -1));
        ctx.scale(1, 0.22 + r * 0.14);
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1.08 + r * 0.16), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${coreRim}, ${0.2 + hover * 0.18 + breath * 0.08 - r * 0.03})`;
        ctx.lineWidth = r === 0 ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();
      }

      /* node positions */
      const pts = nodes.map((n) => {
        const a = n.angle + t * n.speed * (1 + hover * 0.6 + (thinking ? 0.8 : 0));
        const x = cx + px + Math.cos(a) * n.orbit;
        const y = cy + py + Math.sin(a) * n.orbit * n.tilt;
        return { x, y, label: n.label, phase: n.phase, priority: n.priority };
      });

      /* REASONING LINES — soft cyan graph edges with travelling packets */
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d > radius * 1.9) continue;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(${edge}, ${(0.2 + hover * 0.14) * (1 - d / (radius * 1.9))})`;
          ctx.stroke();

          const k = (t * (thinking ? 0.011 : 0.006) + i * 0.13 + j * 0.07) % 1;
          ctx.beginPath();
          ctx.arc(
            pts[i].x + (pts[j].x - pts[i].x) * k,
            pts[i].y + (pts[j].y - pts[i].y) * k,
            1.4,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(${graph}, 0.8)`;
          ctx.fill();
        }
      }

      /* spokes into the core */
      pts.forEach((pt) => {
        ctx.beginPath();
        ctx.moveTo(cx + px, cy + py);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = `rgba(${pt.priority ? brass : graph}, ${0.06 + hover * 0.06})`;
        ctx.stroke();
      });

      /* INNER CORE — white centre falling off through cyan into navy */
      const grad = ctx.createRadialGradient(
        cx + px - radius * 0.2,
        cy + py - radius * 0.24,
        radius * 0.02,
        cx + px,
        cy + py,
        radius,
      );
      grad.addColorStop(0, `rgba(${WHITE}, ${0.82 + breath * 0.12})`);
      grad.addColorStop(0.14, `rgba(${WHITE}, ${speaking ? 0.5 : 0.34})`);
      grad.addColorStop(0.34, `rgba(${coreRim}, 0.3)`);
      grad.addColorStop(0.7, "rgba(28, 49, 69, 0.5)");
      grad.addColorStop(1, "rgba(9, 21, 33, 0.05)");
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${coreRim}, ${0.42 + hover * 0.24})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      /* neural shell latitudes */
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        ctx.beginPath();
        ctx.ellipse(
          cx + px,
          cy + py,
          radius,
          radius * Math.abs(Math.cos(f * Math.PI + t * 0.002)),
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(${coreRim}, 0.12)`;
        ctx.stroke();
      }

      /* emitted intelligence wave */
      const wave = (t * 0.5) % 160;
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, radius + wave, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${coreRim}, ${Math.max(0, 0.24 - wave / 520)})`;
      ctx.stroke();

      /* nodes + khaki metadata labels */
      pts.forEach((pt) => {
        const pulse = 0.6 + Math.sin(t * 0.05 + pt.phase) * 0.4;
        const tone = pt.priority ? brass : graph;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tone}, ${0.5 + pulse * 0.5})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${tone}, ${0.12 + pulse * 0.14})`;
        ctx.stroke();

        if (!compact) {
          ctx.font = "9px ui-monospace, monospace";
          ctx.fillStyle = `rgba(${KHAKI}, ${0.45 + hover * 0.4})`;
          ctx.fillText(pt.label.toUpperCase(), pt.x + 10, pt.y + 3);
        }
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [size, compact, mode, confidence]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden="true"
    />
  );
}
