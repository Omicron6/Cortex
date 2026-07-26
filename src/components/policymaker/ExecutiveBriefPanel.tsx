import { useEffect, useState } from "react";
import { FileSignature, ShieldCheck } from "lucide-react";
import type { ExecutiveBrief, GovRecommendation } from "@/lib/governance-types";

const priorityTone: Record<string, string> = {
  Immediate: "border-maroon/55 text-maroon",
  High: "border-warning/55 text-warning",
  Medium: "border-primary/55 text-primary",
  Routine: "border-khaki/45 text-khaki",
};

/** Renders the executive brief section by section so it never blocks the view. */
export function ExecutiveBriefPanel({
  brief,
  recommendations,
  loading,
}: {
  brief?: ExecutiveBrief | null;
  recommendations?: GovRecommendation[];
  loading?: boolean;
}) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!brief) return;
    setRevealed(0);
    const id = window.setInterval(() => {
      setRevealed((n) => {
        if (n >= brief.sections.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [brief]);

  return (
    <aside className="h-full bg-sidebar">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <span className="label-official text-xs">Executive Brief</span>
        {brief && <span className="label-meta">{brief.confidence}% confidence</span>}
      </div>

      {loading || !brief ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-surface/60" style={{ height: i % 2 ? 12 : 32 }} />
          ))}
        </div>
      ) : (
        <div className="p-3">
          <div className="border border-gold/35 bg-gold/5 p-3">
            <div className="label-tech !text-gold">Prepared for</div>
            <p className="mt-1 text-[11px] leading-relaxed text-foreground">{brief.preparedFor}</p>
            <p className="label-meta mt-1 !text-[9px]">
              {new Date(brief.generatedAt).toLocaleString("en-IN")} · {brief.id}
            </p>
          </div>

          <div className="mt-2 space-y-2">
            {brief.sections.slice(0, Math.max(1, revealed)).map((s) => (
              <section key={s.id} className="animate-fade-in border border-border bg-card p-3">
                <h3 className="font-display text-xs font-semibold tracking-[0.06em] text-foreground">
                  {s.heading}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{s.body}</p>
                {s.bullets && (
                  <ul className="mt-2 space-y-1">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-[11px] text-muted-foreground">
                        <span className="mt-1.5 size-1 shrink-0 bg-gold" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {recommendations && recommendations.length > 0 && (
            <section className="mt-3">
              <div className="label-official text-[10px]">Key Recommendations</div>
              <div className="mt-2 space-y-2">
                {recommendations.map((r) => (
                  <article key={r.id} className="border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[11px] font-semibold text-foreground">{r.action}</h4>
                      <span
                        className={`shrink-0 border px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] ${priorityTone[r.priority]}`}
                      >
                        {r.priority}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-[10px]">
                      <div className="flex gap-2">
                        <dt className="label-meta w-20 shrink-0">Evidence</dt>
                        <dd className="text-muted-foreground">{r.evidence}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="label-meta w-20 shrink-0">Impact</dt>
                        <dd className="text-muted-foreground">{r.expectedImpact}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="label-meta w-20 shrink-0">Confidence</dt>
                        <dd className="font-mono text-primary">{r.confidence}%</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="mt-3 flex items-center gap-2 border border-dashed border-khaki/40 px-3 py-2">
            <FileSignature className="size-3.5 shrink-0 text-khaki" />
            <span className="label-meta !text-[9px]">
              Digital signature placeholder · countersigned on export
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 px-1">
            <ShieldCheck className="size-3 shrink-0 text-gold" />
            <span className="label-meta !text-[9px]">
              Advisory intelligence. Final decisions rest with the competent authority.
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
