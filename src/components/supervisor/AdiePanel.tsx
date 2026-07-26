import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Send, Square } from "lucide-react";
import { useSpeechCapture } from "@/hooks/use-speech-capture";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { OpsErrorState } from "./OpsStatePanels";
import { sendScenario } from "@/lib/decision-api";
import type { DecisionBrief } from "@/lib/decision-types";

const PROCESSING_STEPS = [
  "Synchronizing Intelligence…",
  "Checking District Resources…",
  "Retrieving Historical Events…",
  "Evaluating Crime Trends…",
  "Assessing Threat Levels…",
  "Building Operational Recommendations…",
  "Generating Decision Brief…",
];

const SCENARIO_EXAMPLES = [
  "There is a political rally tomorrow in Mysuru with an expected crowd of 60,000.",
  "Cyber fraud has increased significantly in Bengaluru East.",
  "Prepare security for an IPL match at Chinnaswamy Stadium.",
];

interface Props {
  district: string;
  presetScenario?: string;
  onBrief: (brief: DecisionBrief | null) => void;
  onPendingChange: (pending: boolean) => void;
}

/** Tactical radar sweep overlaid on the command sphere. */
function RadarSweep({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {[18, 30, 42].map((r) => (
        <circle
          key={r}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className="stroke-gold/25"
          strokeWidth="0.2"
        />
      ))}
      <line x1="8" y1="50" x2="92" y2="50" className="stroke-gold/15" strokeWidth="0.2" />
      <line x1="50" y1="8" x2="50" y2="92" className="stroke-gold/15" strokeWidth="0.2" />
      <g className={active ? "origin-center animate-[spin_4s_linear_infinite]" : "origin-center animate-[spin_12s_linear_infinite]"}>
        <path d="M50 50 L92 50 A42 42 0 0 0 79.7 20.3 Z" className="fill-ws/12" />
        <line x1="50" y1="50" x2="92" y2="50" className="stroke-ws/60" strokeWidth="0.3" />
      </g>
    </svg>
  );
}

export function AdiePanel({ district, presetScenario, onBrief, onPendingChange }: Props) {
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [lastScenario, setLastScenario] = useState("");
  const askRef = useRef<(s: string) => void>(() => {});

  /* Press-to-talk via the browser Web Speech API. */
  const voice = useSpeechCapture({
    lang: "en-IN",
    onFinal: (text) => askRef.current(text),
  });
  const { listening, transcript } = voice;


  const scenario = useMutation({
    mutationFn: (message: string) =>
      sendScenario({ district, scenario: message, role: "supervisor" }),
    onSuccess: (brief) => onBrief(brief),
  });

  const ask = (message: string) => {
    const trimmed = message.trim();
    if (trimmed.length < 4 || scenario.isPending) return;
    setLastScenario(trimmed);
    setInput("");
    setStep(0);
    onBrief(null);
    scenario.mutate(trimmed);
  };
  askRef.current = ask;

  useEffect(() => {
    onPendingChange(scenario.isPending);
  }, [scenario.isPending, onPendingChange]);

  /* A template selection fills the engine context. */
  useEffect(() => {
    if (presetScenario) setInput(presetScenario);
  }, [presetScenario]);

  /* Processing narration while the runtime analyses. */
  useEffect(() => {
    if (!scenario.isPending) return;
    const id = window.setInterval(
      () => setStep((s) => Math.min(PROCESSING_STEPS.length - 1, s + 1)),
      520,
    );
    return () => window.clearInterval(id);
  }, [scenario.isPending]);

  /* Voice capture is handled by the Web Speech hook above. */


  const mode = scenario.isPending
    ? "thinking"
    : listening
      ? "listening"
      : scenario.isError
        ? "warning"
        : scenario.data
          ? "speaking"
          : "idle";

  const status = scenario.isPending
    ? PROCESSING_STEPS[step]
    : listening
      ? "Listening — state the operational situation"
      : scenario.isError
        ? "Runtime unreachable — retry or modify the scenario"
        : scenario.data
          ? `Decision brief ready · confidence ${scenario.data.confidence.toFixed(2)}`
          : "Command engine idle · district posture loaded";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="relative flex flex-col items-center overflow-hidden border-b border-border bg-card px-4 pb-5 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-20" />

        <div className="relative flex flex-col items-center">
          <div className="relative">
            <IntelligenceCore size={300} compact mode={mode} />
            <RadarSweep active={scenario.isPending} />
          </div>

          <div className="-mt-6 text-center">
            <div className="label-official text-xs">Adaptive Decision Intelligence Engine</div>
            <div className="label-meta mt-1">{status}</div>
            <div className="label-meta mt-1 !text-[9px]">
              District Command · {district} · Supervisor retains final authority
            </div>
          </div>

          {scenario.isPending && (
            <ol className="mt-4 w-full max-w-sm space-y-1">
              {PROCESSING_STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 font-mono text-[10px] transition-colors ${
                    i < step ? "text-muted-foreground" : i === step ? "text-gold" : "text-muted-foreground/30"
                  }`}
                >
                  <span className={i < step ? "text-success" : ""}>
                    {i < step ? "✔" : i === step ? "▸" : "·"}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          )}

          {listening && (
            <div className="mt-3 flex h-8 items-end gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 animate-pulse bg-ws/70"
                  style={{
                    height: `${8 + ((i * 29) % 26)}px`,
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
              onClick={() => voice.toggle()}
              className={`flex size-11 items-center justify-center border transition-colors ${
                listening
                  ? "border-maroon/60 bg-maroon/15 text-maroon"
                  : "border-primary/55 text-primary hover:bg-primary/10"
              }`}
              aria-label={listening ? "Stop voice capture" : "Start voice capture"}
            >
              {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
            </button>
            <span className="label-meta">Speak the operational situation</span>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Describe an operational situation — event, threat, disaster or deployment requirement…"
            className="min-w-0 flex-1 resize-none border border-input bg-background px-3 py-2 text-xs text-foreground outline-none placeholder:text-subtle focus:border-primary/60 focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={scenario.isPending || input.trim().length < 4}
            className="btn-exec flex h-10 shrink-0 items-center justify-center gap-2 px-4 font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-40"
          >
            <Send className="size-3.5" />
            Analyse Scenario
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCENARIO_EXAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="border border-khaki/30 px-2 py-1 text-left font-mono text-[10px] text-khaki transition-colors hover:border-gold/50 hover:text-gold"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {scenario.isError && (
        <div className="p-4">
          <OpsErrorState
            onRetry={() => lastScenario && scenario.mutate(lastScenario)}
            onModify={() => setInput(lastScenario)}
          />
        </div>
      )}
    </div>
  );
}
