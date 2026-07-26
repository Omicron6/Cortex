import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { VizPanel } from "@/components/analyst/Viz";
import { ChartSkeletonGrid, IntelErrorState } from "@/components/analyst/StatePanels";
import { predictionsQuery } from "@/lib/intelligence-api";
import { useAnalystScope } from "@/lib/analyst-filters";

export const Route = createFileRoute("/analyst/pci")({
  head: () => ({
    meta: [
      { title: "Predictive Crime Intelligence — CORTEX" },
      {
        name: "description",
        content:
          "Forecast hotspots, risk zones and expected crime growth with confidence bands, supporting trends and historical evidence for every prediction.",
      },
      { property: "og:title", content: "Predictive Crime Intelligence — CORTEX" },
      { property: "og:description", content: "Explainable crime forecasting with confidence." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PciPage,
});

const band: Record<string, string> = {
  severe: "text-maroon",
  elevated: "text-warning",
  moderate: "text-khaki",
  low: "text-success",
};

function PciPage() {
  const { filters, reset } = useAnalystScope();
  const pred = useQuery(predictionsQuery(filters));

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="font-display text-lg font-semibold">Predictive Crime Intelligence</h1>
        <div className="label-meta mt-1">
          Forecasts produced by the runtime ML pipeline · every prediction carries confidence and
          supporting evidence
        </div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </header>

      {pred.isLoading ? (
        <ChartSkeletonGrid count={3} />
      ) : pred.isError ? (
        <IntelErrorState onRetry={() => pred.refetch()} onChangeFilters={reset} />
      ) : pred.data ? (
        <>
          <div className="grid gap-px bg-border lg:grid-cols-3">
            <VizPanel viz={pred.data.forecast} />
            <VizPanel viz={pred.data.seasonal} />
            <VizPanel viz={pred.data.growth} />
          </div>

          <section className="mt-px grid gap-px bg-border xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="bg-card">
              <div className="border-b border-border px-3 py-2.5">
                <span className="label-official text-xs">Predictions</span>
              </div>
              <ul className="divide-y divide-khaki/12">
                {pred.data.predictions.map((p) => (
                  <li key={p.id} className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[11px] text-ws">{p.id}</span>
                      <span className="font-display text-sm font-semibold">
                        {p.crimeType} · {p.district}
                      </span>
                      <span className="label-meta">{p.window}</span>
                      <span
                        className={`ml-auto border px-2 py-0.5 font-mono text-[10px] uppercase ${
                          p.confidence > 0.82
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : p.confidence > 0.68
                              ? "border-warning/50 bg-warning/10 text-warning"
                              : "border-maroon/50 bg-maroon/10 text-maroon"
                        }`}
                      >
                        conf {p.confidence.toFixed(2)} · likelihood {p.likelihood.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="label-meta">Supporting trends</div>
                        <ul className="mt-1 space-y-0.5">
                          {p.supportingTrends.map((t) => (
                            <li key={t} className="text-[11px] text-muted-foreground">
                              · {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="label-meta">Historical evidence</div>
                        <ul className="mt-1 space-y-0.5">
                          {p.historicalEvidence.map((t) => (
                            <li key={t} className="text-[11px] text-muted-foreground">
                              · {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="grid content-start gap-px bg-border">
              <div className="bg-card">
                <div className="border-b border-border px-3 py-2.5">
                  <span className="label-official text-xs">Predicted Hotspots</span>
                </div>
                <ul className="divide-y divide-khaki/12">
                  {pred.data.hotspots.map((h) => (
                    <li key={h.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[11px] text-foreground">
                          {h.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-ws">
                          {h.intensity.toFixed(2)}
                        </span>
                      </div>
                      <div className="label-meta">
                        {h.district} · {h.crimeType} · {h.trend}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card">
                <div className="border-b border-border px-3 py-2.5">
                  <span className="label-official text-xs">Risk Zones</span>
                </div>
                <ul className="divide-y divide-khaki/12">
                  {pred.data.riskZones.map((r) => (
                    <li key={r.district} className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                        {r.district}
                      </span>
                      <span className={`font-mono text-[10px] uppercase ${band[r.band]}`}>
                        {r.band}
                      </span>
                      <span className="w-7 text-right font-mono text-[10px] text-foreground">
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card">
                <div className="border-b border-border px-3 py-2.5">
                  <span className="label-official text-xs">Prediction Timeline</span>
                </div>
                <ol className="divide-y divide-khaki/12">
                  {pred.data.timeline.map((e) => (
                    <li key={e.id} className="px-3 py-2">
                      <div className="text-[11px] text-foreground">{e.title}</div>
                      <p className="text-[10px] text-muted-foreground">{e.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </div>
  );
}
