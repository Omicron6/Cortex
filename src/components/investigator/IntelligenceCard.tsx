import { useState } from "react";
import { ChevronDown, FileText, Layers, ListChecks, Quote, ShieldQuestion } from "lucide-react";
import type { ChatResponse } from "@/lib/investigation-types";

const bandTone: Record<string, string> = {
  high: "text-primary border-primary/50 bg-primary/10",
  medium: "text-warning border-warning/50 bg-warning/10",
  low: "text-maroon border-maroon/50 bg-maroon/10",
};

interface Props {
  question: string;
  response: ChatResponse;
  onAction: (actionId: string) => void;
}

export function IntelligenceCard({ question, response, onAction }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <article className="border border-border bg-card">
      <header className="border-b border-border">
        <div className="flex items-start gap-3 px-4 py-3">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-khaki" />
          <div className="min-w-0 flex-1">
            <div className="label-meta">Officer query</div>
            <p className="mt-1 text-sm text-foreground">{question}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-khaki/12 px-4 py-2">
          <span className="label-official text-xs">Investigation Report</span>
          <span className="label-meta">{response.messageId}</span>
          <span
            className={`ml-auto border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
              bandTone[response.confidenceBand]
            }`}
          >
            Confidence {response.confidence.toFixed(2)} · {response.confidenceBand}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-6 items-center justify-center border border-border text-muted-foreground transition-colors hover:text-primary"
            aria-label={open ? "Collapse report" : "Expand report"}
          >
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="label-meta">Answer</div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{response.answer}</p>
      </div>

      {open && (
        <div className="divide-y divide-khaki/12 border-t border-khaki/12">
          <Section icon={Layers} title="Evidence">
            <ul className="space-y-2">
              {response.evidence.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-[11px] text-ws">{e.id}</span>
                  <span className="text-xs text-foreground">{e.label}</span>
                  <span className="text-[11px] text-muted-foreground">{e.detail}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={ShieldQuestion} title="Reasoning">
            <ol className="space-y-2">
              {response.reasoning.map((r, i) => (
                <li key={r.step} className="flex gap-3">
                  <span className="font-mono text-[11px] text-khaki">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground">{r.step}</div>
                    <p className="text-[11px] text-muted-foreground">{r.detail}</p>
                  </div>
                  <span className="font-mono text-[11px] text-success">
                    {r.confidence.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={FileText} title="Referenced Records">
            <ul className="flex flex-wrap gap-2">
              {response.references.map((r) => (
                <li
                  key={r.id}
                  className="border border-khaki/35 bg-khaki/5 px-2 py-1 font-mono text-[10px] text-khaki"
                >
                  {r.label} · {r.source}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={ListChecks} title="Suggested Next Steps">
            <ol className="list-inside list-decimal space-y-1 text-[11px] text-muted-foreground">
              {response.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Section>
        </div>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {response.suggestedActions.map((a) => (
          <button
            key={a.id}
            onClick={() => onAction(a.id)}
            className="border border-primary/45 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/12"
          >
            {a.label}
          </button>
        ))}
      </footer>
    </article>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Layers;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 text-khaki" />
        <span className="label-tech">{title}</span>
      </div>
      {children}
    </section>
  );
}
