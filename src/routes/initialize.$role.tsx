import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { CortexMark } from "@/components/cortex/CortexMark";
import { INIT_MESSAGES, getWorkspace } from "@/lib/cortex-data";

export const Route = createFileRoute("/initialize/$role")({
  head: () => ({
    meta: [
      { title: "Mission Initialization — CORTEX" },
      {
        name: "description",
        content: "Initializing the CORTEX Crime Intelligence Runtime for the selected workspace.",
      },
      { property: "og:title", content: "Mission Initialization — CORTEX" },
      { property: "og:description", content: "Loading knowledge graph and role context." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MissionInit,
});

function MissionInit() {
  const { role } = useParams({ from: "/initialize/$role" });
  const navigate = useNavigate();
  const workspace = getWorkspace(role);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!workspace) {
      navigate({ to: "/console", replace: true });
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= INIT_MESSAGES.length - 1) {
          window.clearInterval(id);
          window.setTimeout(
            () =>
              role === "investigator"
                ? navigate({ to: "/investigator", search: {}, replace: true })
                : role === "analyst"
                  ? navigate({ to: "/analyst", search: {}, replace: true })
                  : role === "supervisor"
                    ? navigate({ to: "/supervisor", search: {}, replace: true })
                    : role === "policymaker"
                      ? navigate({ to: "/policymaker", search: {}, replace: true })
                      : navigate({ to: "/workspace/$role", params: { role }, replace: true }),
            700,
          );

          return s;
        }
        return s + 1;
      });
    }, 750);
    return () => window.clearInterval(id);
  }, [workspace, navigate, role]);

  const progress = ((step + 1) / INIT_MESSAGES.length) * 100;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="absolute inset-0 bg-blueprint opacity-25" />
      <div className="absolute inset-0 bg-core-glow" />

      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-3">
          <CortexMark size={22} className="text-primary" />
          <span className="font-display text-xs font-bold tracking-[0.34em]">CORTEX</span>
        </div>

        <IntelligenceCore size={360} compact mode="thinking" className="mt-4" />

        <div className="mt-2 text-center">
          <div className="label-official text-xs">Mission Initialization</div>
          <h1 className="mt-3 font-display text-xl font-semibold">
            {workspace?.engine ?? "Intelligence Engine"}
          </h1>
        </div>

        <div className="mt-8 w-full max-w-md">
          <div className="h-px w-full bg-border">
            <div
              className="h-px bg-gradient-to-r from-gold to-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-5 space-y-2">
            {INIT_MESSAGES.map((m, i) => (
              <div
                key={m}
                className={`flex items-center gap-3 font-mono text-[11px] transition-colors ${
                  i < step
                    ? "text-muted-foreground"
                    : i === step
                      ? "text-primary"
                      : "text-muted-foreground/30"
                }`}
              >
                <span className={i <= step ? "text-success" : "text-muted-foreground/30"}>
                  {i < step ? "✔" : i === step ? "▸" : "·"}
                </span>
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
