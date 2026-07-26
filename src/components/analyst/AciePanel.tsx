import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Send, Square } from "lucide-react";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { IntelligenceReportCard } from "./IntelligenceReportCard";
import { IntelErrorState } from "./StatePanels";
import { sendIntelligenceQuery } from "@/lib/intelligence-api";
import type { IntelligenceFilters, IntelligenceQueryResult } from "@/lib/intelligence-types";

const VOICE_EXAMPLES = [
  "Show robbery trends across Mysuru.",
  "Find emerging cyber crime clusters.",
  "Which districts have increasing narcotics activity?",
  "Identify active organized crime groups.",
  "Forecast next month's hotspots.",
  "Display repeat offender growth.",
];

const TEXT_EXAMPLES = [
  "Show chain-snatching hotspots.",
  "Compare Bengaluru and Mysuru.",
  "Generate organized crime report.",
  "Find repeat offender clusters.",
  "Which gangs expanded recently?",
];

interface Props {
  filters: IntelligenceFilters;
  scopeLabel: string;
  onOpenDashboard?: () => void;
}

export function AciePanel({ filters, scopeLabel, onOpenDashboard }: Props) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reports, setReports] = useState<{ id: string; report: IntelligenceQueryResult }[]>([]);
  const [lastQuestion, setLastQuestion] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  const query = useMutation({
    mutationFn: (message: string) =>
      sendIntelligenceQuery({ role: "analyst", filters, message }),
    onSuccess: (report) => setReports((prev) => [{ id: report.queryId, report }, ...prev]),
  });

  const ask = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || query.isPending) return;
    setLastQuestion(trimmed);
    setInput("");
    query.mutate(trimmed);
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Simulated voice capture — the real runtime supplies transcription. */
  useEffect(() => {
    if (!listening) return;
    const phrase = VOICE_EXAMPLES[Math.floor(Math.random() * VOICE_EXAMPLES.length)];
    let i = 0;
    const tick = setInterval(() => {
      i += 2;
      setTranscript(phrase.slice(0, i));
      if (i >= phrase.length) {
        clearInterval(tick);
        setListening(false);
        setTimeout(() => {
          setTranscript("");
          ask(phrase);
        }, 500);
      }
    }, 45);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const mode = query.isPending
    ? "thinking"
    : listening
      ? "listening"
      : reports.length
        ? "speaking"
        : "idle";

  const status = useMemo(() => {
    if (query.isPending) return "Analysing Intelligence…";
    if (listening) return "Listening — state your intelligence request";
    if (query.isError) return "Runtime unreachable — retry the request";
    if (reports[0])
      return `Analysis complete · confidence ${reports[0].report.confidence.toFixed(2)}`;
    return "Engine idle · statewide corpus loaded";
  }, [query.isPending, query.isError, listening, reports]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="relative flex flex-col items-center overflow-hidden border-b border-border bg-card px-4 pb-5 pt-6">
        <div className="pointer-events-none absolute inset-0 text-ws/14">
          <GraphBackdrop nodes={26} className="h-full w-full" />
        </div>

        <div className="relative flex flex-col items-center">
          <IntelligenceCore
            size={300}
            compact
            mode={mode as "idle" | "thinking" | "listening" | "speaking"}
            confidence={reports[0]?.report.confidenceBand}
          />
          <div className="-mt-6 text-center">
            <div className="label-official text-xs">Adaptive Crime Intelligence Engine</div>
            <div className="label-meta mt-1">{status}</div>
            <div className="label-meta mt-1 !text-[9px]">Scope · {scopeLabel}</div>
          </div>

          {listening && (
            <div className="mt-3 flex h-8 items-end gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 animate-pulse bg-ws/70"
                  style={{
                    height: `${8 + ((i * 31) % 26)}px`,
                    animationDelay: `${i * 55}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>
          )}

          {transcript && (
            <p className="mt-3 max-w-lg text-center font-mono text-[11px] text-ws">{transcript}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setListening((l) => !l)}
              className={`flex size-11 items-center justify-center border transition-colors ${
                listening
                  ? "border-maroon/60 bg-maroon/15 text-maroon"
                  : "border-primary/55 text-primary hover:bg-primary/10"
              }`}
              aria-label={listening ? "Stop voice capture" : "Start voice capture"}
            >
              {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
            </button>
            <span className="label-meta">Voice intelligence request</span>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {VOICE_EXAMPLES.slice(0, 3).map((v) => (
              <button
                key={v}
                onClick={() => ask(v)}
                className="border border-khaki/25 px-2 py-1 font-mono text-[10px] text-khaki transition-colors hover:border-ws/50 hover:text-foreground"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about statewide crime intelligence..."
            className="h-10 min-w-0 flex-1 border border-input bg-background px-3 text-xs text-foreground outline-none placeholder:text-subtle focus:border-primary/60 focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={query.isPending || !input.trim()}
            className="flex h-10 shrink-0 items-center gap-2 border border-primary/60 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            <Send className="size-3.5" />
            Analyse
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TEXT_EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => ask(e)}
              className="border border-khaki/30 px-2 py-1 font-mono text-[10px] text-khaki transition-colors hover:border-primary/50 hover:text-primary"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {query.isError && (
          <IntelErrorState onRetry={() => lastQuestion && query.mutate(lastQuestion)} />
        )}

        {query.isPending && (
          <div className="border border-border bg-card p-4">
            <div className="label-meta">Analysing Intelligence…</div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-2/3 animate-pulse bg-surface/60" />
              <div className="h-3 w-full animate-pulse bg-surface/60" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="h-28 animate-pulse bg-surface/50" />
                <div className="h-28 animate-pulse bg-surface/50" />
              </div>
            </div>
          </div>
        )}

        {reports.length === 0 && !query.isPending && !query.isError && (
          <div className="border border-dashed border-border p-6 text-center">
            <div className="label-official text-xs">Engine standing by</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ask a question by voice or text, or apply a quick intelligence filter. Every answer
              returns as an official intelligence report with patterns, evidence, visualizations and
              recommendations supplied by the runtime.
            </p>
          </div>
        )}

        {reports.map((r) => (
          <IntelligenceReportCard key={r.id} report={r.report} onOpenDashboard={onOpenDashboard} />
        ))}
      </div>
    </div>
  );
}
