import { useEffect, useState } from "react";
import { TICKER_ITEMS } from "@/lib/cortex-data";

const toneClass: Record<string, string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
};


/** Bloomberg-style live intelligence ticker. */
export function IntelligenceTicker() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setOffset((o) => o + 1), 9000);
    return () => window.clearInterval(id);
  }, []);

  const items = TICKER_ITEMS.map(
    (_, i) => TICKER_ITEMS[(i + offset) % TICKER_ITEMS.length],
  );
  const stream = [...items, ...items];

  return (
    <div className="relative flex h-8 items-center overflow-hidden border-b border-border bg-card">
      <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-border bg-surface/70 px-3">
        <span className="size-1.5 animate-pulse-node rounded-full bg-maroon" />
        <span className="label-tech !text-gold">Live Intel</span>
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap px-6">
          {stream.map((item, i) => (
            <span key={i} className="flex items-center gap-2 font-mono text-[11px]">
              <span className={`text-[9px] ${toneClass[item.level]}`}>◆</span>
              <span className="text-muted-foreground">{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
