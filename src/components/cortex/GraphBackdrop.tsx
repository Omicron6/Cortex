import { useMemo } from "react";

interface Props {
  nodes?: number;
  className?: string;
}

/** Static-seeded animated knowledge graph used as a backdrop layer. */
export function GraphBackdrop({ nodes = 26, className }: Props) {
  const { points, edges } = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const points = Array.from({ length: nodes }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: 0.35 + rand() * 0.5,
      d: rand() * 3,
    }));
    const edges: { a: number; b: number }[] = [];
    points.forEach((p, i) => {
      points.forEach((q, j) => {
        if (j <= i) return;
        if (Math.hypot(p.x - q.x, p.y - q.y) < 22) edges.push({ a: i, b: j });
      });
    });
    return { points, edges };
  }, [nodes]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {edges.map((e, i) => (
        <line
          key={i}
          x1={points[e.a].x}
          y1={points[e.a].y}
          x2={points[e.b].x}
          y2={points[e.b].y}
          stroke="currentColor"
          strokeWidth="0.12"
          opacity="0.35"
          className="animate-flow"
          style={{ animationDelay: `${(i % 7) * 0.18}s` }}
        />
      ))}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="currentColor"
          className="animate-pulse-node"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}
    </svg>
  );
}
