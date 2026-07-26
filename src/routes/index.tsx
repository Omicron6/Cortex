import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  Lock,
  Radar,
  Scale,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { IntelligenceTicker } from "@/components/cortex/IntelligenceTicker";
import { CortexMark } from "@/components/cortex/CortexMark";
import {
  ARCHITECTURE_LAYERS,
  CATALYST_SERVICES,
  WORKSPACES,
} from "@/lib/cortex-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CORTEX — Crime Intelligence Operating System | KSP" },
      {
        name: "description",
        content:
          "CORTEX transforms Karnataka State Police SCRB crime records into explainable operational intelligence for investigators, analysts, supervisors and policymakers.",
      },
      { property: "og:title", content: "CORTEX — Crime Intelligence Operating System" },
      {
        property: "og:description",
        content:
          "AI-native crime intelligence built on Karnataka State Police SCRB infrastructure.",
      },
    ],
  }),
  component: Landing,
});

const workspaceIcons = [Radar, BrainCircuit, Siren, Scale];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <IntelligenceTicker />

      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6">
          <div className="flex items-center gap-3">
            <CortexMark size={24} className="text-primary" />
            <span className="font-display text-sm font-bold tracking-[0.3em]">CORTEX</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#workspaces" className="label-tech hover:text-primary">
              Workspaces
            </a>
            <a href="#architecture" className="label-tech hover:text-primary">
              Architecture
            </a>
            <a href="#technology" className="label-tech hover:text-primary">
              Technology
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="label-meta hidden lg:inline">
              SCRB Link <span className="text-success">● Online</span>
            </span>
            <Link
              to="/auth"
              className="btn-ghost-intel px-3 py-1.5 !text-[11px] !tracking-[0.18em]"
            >
              Enter CORTEX
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh-6rem)] items-center overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-blueprint opacity-40" />
        <div className="absolute inset-0 bg-core-glow" />
        <div className="absolute inset-y-0 right-0 w-1/2 text-primary/25">
          <GraphBackdrop nodes={22} className="h-full w-full" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-rise">
            <div className="flex items-center gap-3">
              <CortexMark size={44} className="text-primary" />
              <div>
                <div className="font-display text-3xl font-bold tracking-[0.34em] leading-none">
                  CORTEX
                </div>
                <div className="label-meta mt-2">
                  Crime Operational Reasoning &amp; Tactical EXecution
                </div>
              </div>
            </div>

            <div className="ksp-rule mt-8 h-px w-40 opacity-70" />

            <h1 className="mt-8 max-w-2xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Transforming Crime Records into{" "}
              <span className="text-primary">Actionable Intelligence.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              An AI-native Crime Intelligence Operating System built on top of Karnataka State
              Police's SCRB infrastructure that enables investigators, analysts, supervisors and
              policymakers to transform structured crime records into explainable operational
              intelligence.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                className="btn-intel group px-6 py-3"
              >
                Enter CORTEX
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/architecture"
                className="btn-ghost-intel px-6 py-3 !text-foreground hover:!text-primary"
              >
                Explore Architecture
              </Link>
            </div>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
              {[
                ["1,100+", "Police Stations"],
                ["31", "Districts"],
                ["12.4M", "Records Indexed"],
                ["4", "AI Workspaces"],
              ].map(([v, l]) => (
                <div key={l} className="bg-card px-4 py-3">
                  <dt className="font-mono text-lg text-primary">{v}</dt>
                  <dd className="label-meta mt-1">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="corner-ticks relative flex aspect-square w-full max-w-[560px] items-center justify-center border border-border/70 bg-card/30">
              <div className="absolute left-3 top-3 label-official text-[10px]">
                Crime Intelligence Runtime
              </div>
              <div className="absolute bottom-3 right-3 font-mono text-[10px] text-primary">
                CORE · ACTIVE
              </div>
              <IntelligenceCore size={500} mode="thinking" className="max-w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* WORKSPACES */}
      <section id="workspaces" className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <SectionHeading
            index="01"
            label="Operational Workspaces"
            title="Four role-aware intelligence engines"
            note="Each workspace initializes a dedicated AI persona bound to the operator's role, jurisdiction and clearance."
          />

          <div className="mt-12 grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {WORKSPACES.map((ws, i) => {
              const Icon = workspaceIcons[i];
              return (
                <article
                  key={ws.id}
                  className="card-intel group relative overflow-hidden p-6"
                >
                  <div className="pointer-events-none absolute inset-0 text-primary/0 transition-colors duration-300 group-hover:text-primary/25">
                    <GraphBackdrop nodes={14} className="h-full w-full" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="label-meta">{ws.code}</span>
                      <Icon className="size-4 text-primary/70 transition-colors group-hover:text-primary" />
                    </div>
                    <h3 className="mt-6 font-display text-xl font-semibold">{ws.role}</h3>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-primary/80">
                      {ws.engine}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{ws.purpose}</p>
                    <ul className="mt-6 space-y-1.5">
                      {ws.nav.slice(0, 3).map((n) => (
                        <li
                          key={n.label}
                          className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground"
                        >
                          <span className="size-1 bg-khaki/70" />
                          {n.label}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 h-px w-full bg-khaki/25 transition-colors group-hover:bg-primary/50" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <SectionHeading
            index="02"
            label="Platform Architecture"
            title="Intelligence flow, station to statehouse"
            note="Every layer is auditable. Every inference traces back to its source record."
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
            <ol className="relative space-y-px">
              {ARCHITECTURE_LAYERS.map((layer, i) => (
                <li key={layer.id} className="relative">
                  <div className="scan-line panel-flat flex items-center gap-5 px-5 py-4 [--scan-distance:64px]">
                    <span className="font-mono text-[11px] text-gold">{layer.id}</span>
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold">{layer.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{layer.detail}</div>
                    </div>
                    <div className="ml-auto hidden items-center gap-1.5 sm:flex">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <span
                          key={k}
                          className="size-1 animate-pulse-node bg-primary/70"
                          style={{ animationDelay: `${(i * 5 + k) * 0.12}s` }}
                        />
                      ))}
                    </div>
                  </div>
                  {i < ARCHITECTURE_LAYERS.length - 1 && (
                    <svg
                      className="mx-auto block h-6 w-4 text-primary/60"
                      viewBox="0 0 4 24"
                      aria-hidden="true"
                    >
                      <line
                        x1="2"
                        y1="0"
                        x2="2"
                        y2="24"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="animate-flow"
                      />
                    </svg>
                  )}
                </li>
              ))}
            </ol>

            <aside className="panel h-fit p-5">
              <div className="label-official text-xs">Runtime Telemetry</div>
              <div className="mt-5 space-y-4">
                {[
                  ["Ingest throughput", "12,483 rec/cycle", "success"],
                  ["Graph edges", "8.42M", "primary"],
                  ["Inference latency", "412 ms", "primary"],
                  ["Model drift", "0.021", "warning"],
                  ["Audit coverage", "100%", "success"],
                ].map(([k, v, tone]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-khaki/20 pb-2">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span
                      className={`font-mono text-xs ${
                        tone === "success"
                          ? "text-success"
                          : tone === "warning"
                            ? "text-warning"
                            : "text-primary"
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 border border-border bg-surface/30 px-3 py-2">
                <Lock className="size-3.5 text-success" />
                <span className="label-official text-[10px]">Zero data egress</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY */}
      <section id="technology" className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <SectionHeading
            index="03"
            label="Technology Substrate"
            title="Built on Zoho Catalyst services"
            note="Blueprint-level capability mapping across the CORTEX runtime."
          />

          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            {CATALYST_SERVICES.map((svc, i) => (
              <article
                key={svc.name}
                className="card-intel group p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="label-meta">SVC-{String(i + 1).padStart(2, "0")}</span>
                  <span className="size-1.5 bg-primary/60 transition-colors group-hover:bg-primary" />
                </div>
                <h3 className="mt-5 font-display text-[15px] font-semibold">{svc.name}</h3>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                  {svc.role}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{svc.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-blueprint opacity-30" />
        <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <div className="label-official text-xs">Restricted Access</div>
            <h2 className="mt-3 font-display text-2xl font-bold">
              Authorized personnel of Karnataka State Police only.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Access is bound to verified devices and role-based clearance. All sessions are
              logged for audit.
            </p>
          </div>
          <Link
            to="/auth"
            className="btn-intel ml-auto px-6 py-3"
          >
            <ShieldCheck className="size-4" />
            Enter CORTEX
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export function SectionHeading({
  index,
  label,
  title,
  note,
}: {
  index: string;
  label: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="grid gap-6 border-b border-border pb-6 md:grid-cols-[auto_1fr_auto] md:items-end">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-gold">{index}</span>
        <span className="label-tech">{label}</span>
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {note && <p className="max-w-sm text-xs text-muted-foreground md:text-right">{note}</p>}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-10 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <CortexMark size={20} className="text-primary" />
        <span className="font-display text-xs font-bold tracking-[0.3em]">CORTEX</span>
      </div>
      <div className="md:ml-auto flex flex-col gap-1 font-mono text-[11px] text-muted-foreground md:flex-row md:gap-6">
        <span>Built for Karnataka State Police Datathon 2026.</span>
        <span>Powered by Zoho Catalyst.</span>
      </div>
    </footer>
  );
}
