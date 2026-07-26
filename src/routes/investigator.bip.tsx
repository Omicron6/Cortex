import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { bipQuery } from "@/lib/investigation-api";
import {
  EmptyInvestigation,
  PanelSkeleton,
  RuntimeErrorState,
} from "@/components/investigator/StatePanels";

export const Route = createFileRoute("/investigator/bip")({
  head: () => ({
    meta: [
      { title: "Behavioral Intelligence Profile — CORTEX" },
      {
        name: "description",
        content:
          "Behavioural intelligence profile for the case subject: risk score, repeat offender probability, known modus operandi and psychological indicators.",
      },
      { property: "og:title", content: "Behavioral Intelligence Profile — CORTEX" },
      { property: "og:description", content: "Offender behaviour intelligence for the case." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BipPage,
});

function BipPage() {
  const { caseId } = Route.useSearch();
  const navigate = useNavigate();
  const bip = useQuery(bipQuery(caseId ?? ""));

  if (!caseId)
    return (
      <div className="p-6">
        <EmptyInvestigation onSelect={() => navigate({ to: "/investigator" })} />
      </div>
    );

  const maxFreq = Math.max(1, ...(bip.data?.crimeFrequency.map((f) => f.value) ?? [1]));

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="font-display text-lg font-semibold">Behavioral Intelligence Profile</h1>
        <div className="label-meta mt-1">Case {caseId} · profile served by ML runtime</div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </header>

      {bip.isLoading ? (
        <PanelSkeleton rows={8} />
      ) : bip.isError ? (
        <RuntimeErrorState onRetry={() => bip.refetch()} />
      ) : bip.data ? (
        <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-px bg-border">
            <section className="bg-card p-4">
              <div className="label-official text-xs">Behaviour Summary</div>
              <div className="label-meta mt-1">{bip.data.subject}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {bip.data.behaviourSummary}
              </p>
            </section>

            <section className="grid gap-px bg-border sm:grid-cols-3">
              {[
                ["Risk Score", bip.data.riskScore.toFixed(2), "text-maroon"],
                [
                  "Repeat Offender Probability",
                  bip.data.repeatOffenderProbability.toFixed(2),
                  "text-gold",
                ],
                ["Priority Level", bip.data.priorityLevel, "text-primary"],
              ].map(([label, value, tone]) => (
                <div key={label} className="bg-card px-4 py-4">
                  <div className="label-meta">{label}</div>
                  <div className={`mt-2 font-mono text-2xl ${tone}`}>{value}</div>
                </div>
              ))}
            </section>

            <section className="bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="label-official text-xs">Crime Frequency</span>
              </div>
              <div className="flex h-44 items-end gap-2 px-4 pb-4 pt-6">
                {bip.data.crimeFrequency.map((f) => (
                  <div key={f.label} className="flex h-full flex-1 flex-col items-center gap-2">
                    <div className="flex h-full w-full items-end">
                      <div
                        className="w-full border-t-2 border-ws bg-ws/18"
                        style={{ height: `${(f.value / maxFreq) * 100}%` }}
                      />
                    </div>
                    <span className="label-meta !text-[9px]">{f.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-px bg-border">
            <section className="bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="label-official text-xs">Known MO</span>
              </div>
              <ul className="divide-y divide-khaki/12">
                {bip.data.knownMo.map((m) => (
                  <li key={m} className="px-4 py-2.5 text-[11px] text-muted-foreground">
                    {m}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="label-official text-xs">Psychological Indicators</span>
              </div>
              <ul className="space-y-3 px-4 py-3">
                {bip.data.psychologicalIndicators.map((p) => (
                  <li key={p.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{p.label}</span>
                      <span className="font-mono text-[11px] text-gold">{p.value.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-px w-full bg-border">
                      <div className="h-px bg-ws" style={{ width: `${p.value * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
