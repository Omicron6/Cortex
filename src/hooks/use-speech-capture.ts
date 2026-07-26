import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Press-to-talk voice capture backed by the browser Web Speech API.
 *
 * The MVP handles STT entirely on the client (no Zia STT round-trip), so this
 * hook is the single voice entry point for every CORTEX workspace copilot.
 */
export function useSpeechCapture(options?: { lang?: string; onFinal?: (text: string) => void }) {
  const lang = options?.lang ?? "en-IN";
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const onFinalRef = useRef(options?.onFinal);
  onFinalRef.current = options?.onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* recogniser already released */
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* recogniser already released */
    }
    setListening(false);
    const text = transcriptRef.current.trim();
    if (text) onFinalRef.current?.(text);
    return text;
  }, []);

  const start = useCallback(() => {
    const Ctor =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!Ctor) {
      setSupported(false);
      setTranscript("Voice capture unavailable on this device — use text input.");
      return false;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      transcriptRef.current = text;
      setTranscript(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    transcriptRef.current = "";
    setTranscript("");
    setListening(true);
    return true;
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) return stop();
    start();
    return "";
  }, [listening, start, stop]);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
  }, []);

  return { listening, transcript, supported, start, stop, toggle, reset };
}
