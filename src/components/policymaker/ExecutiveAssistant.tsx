import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { VizGrid } from "@/components/analyst/Viz";
import { sendGovernanceQuery } from "@/lib/governance-api";
import type { GovernanceFilters } from "@/lib/governance-types";
import { GovErrorState, GovSkeleton } from "./GovStatePanels";

const PROMPTS = [
  "Which districts need additional cyber investigation capacity?",
  "Summarise conviction performance for the financial year.",
  "Where is the largest resource gap relative to crime load?",
];

/**
 * Executive Intelligence Assistant — deliberately secondary in this workspace.
 * The dashboard and reports remain the primary interface.
 */
export function ExecutiveAssistant({
  filters,
  scopeLabel,
}: {
  filters: GovernanceFilters;
  scopeLabel: string;
}) {
  const [value, setValue] = useState("");

  const ask = useMutation({
    mutationFn: (query: string) => sendGovernanceQuery({ role: "policymaker", filters, query }),
  });

  return (
    <section className="border-b border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="label-official text-xs">Executive Intelligence Assistant</span>
        <span className="label-meta truncate">{scopeLabel}</span>
      </div>

      <div className="flex items-start gap-4 p-4">
        <div className="hidden shrink-0 sm:block">
          <IntelligenceCore
            size={96}
            compact
            mode={ask.isPending ? "thinking" : ask.isError ? "warning" : "idle"}
          />
        </div>

        <div className="min-w-0 flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim().length > 1) ask.mutate(value.trim());
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex min-w-0 flex-1 items-center">
              <Sparkles className="absolute left-3 size-3.5 text-gold/70" />
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ask a governance question — statewide trends, performance, resources"
                aria-label="Governance question"
                className="h-9 w-full border border-input bg-background pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-subtle focus:border-gold/60 focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={ask.isPending}
              className="flex h-9 items-center gap-1.5 border border-gold/60 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-60"
            >
              <CornerDownLeft className="size-3" />
              Ask
            </button>
          </form>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setValue(p);
                  ask.mutate(p);
                }}
                className="border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ask.isPending && <GovSkeleton rows={3} />}
      {ask.isError && (
        <div className="p-4">
          <GovErrorState onRetry={() => ask.mutate(value || PROMPTS[0])} />
        </div>
      )}
      {ask.data && (
        <div className="animate-fade-in border-t border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="label-tech">{ask.data.queryId}</span>
            <span className="label-meta">{ask.data.confidence}% confidence</span>
          </div>
          <div className="p-4">
            <p className="text-xs leading-relaxed text-foreground">{ask.data.executiveSummary}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {ask.data.evidence.map((e) => (
                <div key={e.id} className="border border-border p-2">
                  <div className="label-meta">{e.label}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{e.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <VizGrid charts={ask.data.charts} />
        </div>
      )}
    </section>
  );
}
