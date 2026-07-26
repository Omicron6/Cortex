import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { IntelligenceCore, type CoreMode } from "@/components/cortex/IntelligenceCore";
import { RuntimeError, sendChat } from "@/lib/investigation-api";
import type { ChatResponse } from "@/lib/investigation-types";
import { IntelligenceCard } from "./IntelligenceCard";
import { RuntimeErrorState } from "./StatePanels";

const EXAMPLES = [
  "Who is this suspect?",
  "Has he offended before?",
  "Find similar robbery cases.",
  "Generate investigation summary.",
  "Show financial links.",
  "Display all known associates.",
];

interface Exchange {
  id: string;
  question: string;
  response: ChatResponse;
}

interface Props {
  caseId: string;
  onAction: (actionId: string) => void;
}

export function CopilotPanel({ caseId, onAction }: Props) {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const recognitionRef = useRef<any>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (message: string) =>
      sendChat({
        caseId,
        role: "investigator",
        message,
        conversationId: exchanges[0]?.response.conversationId,
      }),
    onSuccess: (response, message) =>
      setExchanges((prev) => [{ id: response.messageId, question: message, response }, ...prev]),
  });

  useEffect(() => {
    setExchanges([]);
    chat.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [exchanges.length]);

  const latest = exchanges[0]?.response;
  const mode: CoreMode = chat.isPending
    ? "thinking"
    : listening
      ? "listening"
      : latest
        ? "speaking"
        : "idle";

  function ask(message: string) {
    const trimmed = message.trim();
    if (!trimmed || chat.isPending) return;
    setLastQuestion(trimmed);
    setInput("");
    setTranscript("");
    chat.mutate(trimmed);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (transcript.trim()) ask(transcript);
      return;
    }
    const Ctor =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!Ctor) {
      setTranscript("Voice capture unavailable on this device — use text input.");
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setTranscript("");
    setListening(true);
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <div className="relative flex flex-col items-center overflow-hidden border-b border-border bg-card/40 px-4 pb-4 pt-2">
        <div className="pointer-events-none absolute inset-0 bg-core-glow" />
        <div className="relative flex flex-col items-center">
          <IntelligenceCore
            size={280}
            compact
            mode={mode}
            confidence={latest?.confidenceBand}
          />
          <div className="-mt-4 text-center">
            <div className="label-official text-xs">Adaptive Investigation Copilot</div>
            <div className="label-meta mt-1">
              {chat.isPending
                ? "Analysing Investigation…"
                : listening
                  ? "Listening — speak your query"
                  : latest
                    ? `Reasoning complete · confidence ${latest.confidence.toFixed(2)}`
                    : "Runtime idle · awaiting instruction"}
            </div>
          </div>

          {listening && (
            <div className="mt-3 flex h-8 items-end gap-1">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 animate-pulse bg-primary/70"
                  style={{
                    height: `${8 + ((i * 37) % 24)}px`,
                    animationDelay: `${i * 60}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>
          )}

          {transcript && (
            <p className="mt-3 max-w-lg text-center font-mono text-[11px] text-primary">
              {transcript}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={toggleVoice}
              className={`flex size-11 items-center justify-center border transition-colors ${
                listening
                  ? "border-maroon/60 bg-maroon/15 text-maroon"
                  : "border-primary/55 text-primary hover:bg-primary/10"
              }`}
              aria-label={listening ? "Stop voice capture" : "Start voice capture"}
            >
              {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
            </button>
            <span className="label-meta">Hold a thought · tap to speak</span>
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
            placeholder="Ask anything about this investigation..."
            className="h-10 min-w-0 flex-1 border border-input bg-background px-3 text-xs text-foreground outline-none placeholder:text-subtle focus:border-primary/60 focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={chat.isPending || !input.trim()}
            className="flex h-10 shrink-0 items-center gap-2 border border-primary/60 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            <Send className="size-3.5" />
            Ask
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
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
        {chat.isError && (
          <RuntimeErrorState
            message={
              chat.error instanceof RuntimeError
                ? chat.error.message
                : "Unable to connect to Investigation Runtime."
            }
            onRetry={() => lastQuestion && chat.mutate(lastQuestion)}
          />
        )}

        {chat.isPending && (
          <div className="border border-border bg-card p-4">
            <div className="label-meta">Analysing Investigation…</div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-2/3 animate-pulse bg-surface/60" />
              <div className="h-3 w-full animate-pulse bg-surface/60" />
              <div className="h-3 w-5/6 animate-pulse bg-surface/60" />
            </div>
          </div>
        )}

        {exchanges.length === 0 && !chat.isPending && !chat.isError && (
          <div className="border border-dashed border-border p-6 text-center">
            <div className="label-official text-xs">Copilot standing by</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ask a question by voice or text. Every answer returns as an official investigation
              report with evidence, reasoning and referenced records.
            </p>
          </div>
        )}

        {exchanges.map((x) => (
          <IntelligenceCard
            key={x.id}
            question={x.question}
            response={x.response}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}
