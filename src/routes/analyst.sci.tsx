import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { VizGrid, VizPanel } from "@/components/analyst/Viz";
import { ChartSkeletonGrid, IntelErrorState } from "@/components/analyst/StatePanels";
import { socialQuery } from "@/lib/intelligence-api";
import { useAnalystScope } from "@/lib/analyst-filters";

export const Route = createFileRoute("/analyst/sci")({
  head: () => ({
    meta: [
      { title: "Socio-Criminological Intelligence — CORTEX" },
      {
        name: "description",
        content:
          "Aggregate statistical distributions of recorded case attributes, presented as insights for resource planning — correlation is not causation.",
      },
      { property: "og:title", content: "Socio-Criminological Intelligence — CORTEX" },
      {
        property: "og:description",
        content: "Statistical social indicators for planning, not profiling.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SciPage,
});

function SciPage() {
  const { filters, reset } = useAnalystScope();
  const social = useQuery(socialQuery(filters));

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="font-display text-lg font-semibold">Socio-Criminological Intelligence</h1>
        <div className="label-meta mt-1">
          Aggregate statistical distributions supplied by the runtime · planning use only
        </div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </header>

      <div className="mb-4 flex items-start gap-3 border border-khaki/40 bg-khaki/6 px-3 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-khaki" />
        <div>
          <div className="label-official text-xs">Correlation ≠ Causation</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {social.data?.disclaimer ??
              "These are statistical distributions of recorded case attributes and must not be used to infer individual behaviour."}
          </p>
        </div>
      </div>

      {social.isLoading ? (
        <ChartSkeletonGrid count={6} />
      ) : social.isError ? (
        <IntelErrorState onRetry={() => social.refetch()} onChangeFilters={reset} />
      ) : social.data ? (
        <>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {social.data.indicators.map((i) => (
              <div key={i.label} className="bg-card px-3 py-3">
                <div className="label-meta">{i.label}</div>
                <div className="mt-2 font-mono text-lg text-ws">{i.value}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-px">
            <VizGrid charts={social.data.distributions} />
          </div>
          <div className="mt-px">
            <VizPanel viz={social.data.correlations} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Presented as statistical insight only. No conclusion about any individual, community or
            group may be drawn from these aggregates.
          </p>
        </>
      ) : null}
    </div>
  );
}
