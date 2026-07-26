import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { CortexMark } from "@/components/cortex/CortexMark";
import { ARCHITECTURE_LAYERS, CATALYST_SERVICES, ENTITY_NODES } from "@/lib/cortex-data";
import { SectionHeading, SiteFooter } from "./index";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Platform Architecture — CORTEX Intelligence Layer" },
      {
        name: "description",
        content:
          "How CORTEX moves crime data from 1,100+ police stations through the SCRB repository, knowledge graph and intelligence runtime into role-aware AI workspaces.",
      },
      { property: "og:title", content: "Platform Architecture — CORTEX" },
      {
        property: "og:description",
        content:
          "The CORTEX intelligence layer, crime knowledge graph and runtime explained layer by layer.",
      },
    ],
  }),
  component: Architecture,
});

function Architecture() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-6">
          <Link to="/" className="flex items-center gap-3">
            <CortexMark size={22} className="text-primary" />
            <span className="font-display text-sm font-bold tracking-[0.3em]">CORTEX</span>
          </Link>
          <span className="label-tech ml-4 hidden sm:inline">Architecture Dossier</span>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:border-primary/60 hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-blueprint opacity-40" />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-6 py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="label-official text-xs">System Dossier · CTX-ARCH-01</div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight">
              The CORTEX Intelligence Stack
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              CORTEX sits above existing SCRB/CCTNS infrastructure. It does not replace records of
              record — it resolves entities, constructs a crime knowledge graph, and serves
              explainable inference to role-aware personas.
            </p>
            <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-4">
              {ENTITY_NODES.map((n) => (
                <div key={n} className="bg-card px-3 py-2.5">
                  <span className="label-meta">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <IntelligenceCore size={380} compact mode="thinking" />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <SectionHeading
            index="01"
            label="Data Flow"
            title="Seven layers, fully traceable"
            note="Each layer emits audit events into Catalyst Data Store."
          />
          <div className="mt-10 grid gap-px bg-border lg:grid-cols-7">
            {ARCHITECTURE_LAYERS.map((l, i) => (
              <div key={l.id} className="card-intel relative border-0 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-gold">{l.id}</span>
                  <span
                    className="size-1.5 animate-pulse-node bg-primary"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                </div>
                <h3 className="mt-4 font-display text-sm font-semibold leading-snug">{l.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{l.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <SectionHeading
            index="02"
            label="Knowledge Graph"
            title="Entity resolution across every record"
            note="Persons, vehicles and phones are unified before inference runs."
          />
          <div className="relative mt-10 h-64 overflow-hidden border border-border bg-card text-primary/40">
            <GraphBackdrop nodes={44} className="h-full w-full" />
            <div className="absolute bottom-3 left-4 font-mono text-[10px] text-khaki">
              KG-CLUSTER VIEW · 8.42M EDGES
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <SectionHeading index="03" label="Service Map" title="Catalyst capability allocation" />
          <div className="mt-10 grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            {CATALYST_SERVICES.map((s) => (
              <div key={s.name} className="card-intel p-5">
                <h3 className="font-display text-[15px] font-semibold">{s.name}</h3>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                  {s.role}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              to="/auth"
              className="btn-intel px-6 py-3"
            >
              Enter CORTEX
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
