import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrainCircuit, Radar, Scale, Siren, ArrowRight } from "lucide-react";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { CortexMark } from "@/components/cortex/CortexMark";
import { IntelligenceTicker } from "@/components/cortex/IntelligenceTicker";
import { WORKSPACES } from "@/lib/cortex-data";
import { readSession, setActiveRole, useSession } from "@/lib/cortex-session";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Mission Console — Select Operational Workspace | CORTEX" },
      {
        name: "description",
        content:
          "Choose an operational role to initialize the corresponding CORTEX AI intelligence engine.",
      },
      { property: "og:title", content: "Mission Console — CORTEX" },
      {
        property: "og:description",
        content: "Select an operational workspace to initialize its intelligence engine.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MissionConsole,
});

const icons = [Radar, BrainCircuit, Siren, Scale];

function MissionConsole() {
  const navigate = useNavigate();
  const { session, hydrated } = useSession();

  useEffect(() => {
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [hydrated, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <IntelligenceTicker />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 bg-blueprint opacity-30" />
        <div className="absolute inset-0 text-primary/15">
          <GraphBackdrop nodes={30} className="h-full w-full" />
        </div>

        <header className="relative flex h-14 items-center gap-3 border-b border-border px-6">
          <CortexMark size={22} className="text-primary" />
          <span className="font-display text-sm font-bold tracking-[0.3em]">CORTEX</span>
          <span className="label-tech ml-4">Mission Console</span>
          <span className="ml-auto font-mono text-[11px] text-khaki">
            {session ? `OPERATOR · ${session.username.toUpperCase()}` : "OPERATOR · —"}
          </span>
        </header>

        <div className="relative mx-auto w-full max-w-[1400px] px-6 py-14">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Select Operational Workspace.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Choose your operational role to initialize the corresponding AI intelligence engine.
          </p>
          <div className="ksp-rule mt-7 h-px w-32 opacity-70" />

          <div className="mt-12 grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {WORKSPACES.map((ws, i) => {
              const Icon = icons[i];
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveRole(ws.id);
                    navigate({ to: "/initialize/$role", params: { role: ws.id } });
                  }}
                  className="card-intel group relative overflow-hidden p-7 text-left"
                >
                  <div className="pointer-events-none absolute inset-0 text-primary/0 transition-colors duration-300 group-hover:text-primary/30">
                    <GraphBackdrop nodes={16} className="h-full w-full" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:shadow-[inset_0_0_40px_-12px_var(--color-primary)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="label-meta">{ws.code}</span>
                      <Icon className="size-5 text-primary/70 transition-colors group-hover:text-primary" />
                    </div>
                    <h2 className="mt-8 font-display text-2xl font-semibold">{ws.role}</h2>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-primary/80">
                      {ws.engine}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{ws.purpose}</p>
                    <div className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-khaki transition-colors group-hover:text-primary">
                      Initialize
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
