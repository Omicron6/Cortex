import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FlaskConical, Info, Play } from "lucide-react";
import { VizGrid } from "@/components/analyst/Viz";
import { runPolicySimulation } from "@/lib/governance-api";
import type { GovernanceFilters } from "@/lib/governance-types";
import { GovErrorState } from "./GovStatePanels";

const POLICIES = [
  "Increase police strength by 10%",
  "Deploy additional cyber units",
  "Increase CCTV coverage",
  "Open new police stations",
  "Expand women safety patrols",
  "Increase night patrolling",
  "Allocate additional forensic resources",
];

export function PolicySimulationPanel({ filters }: { filters: GovernanceFilters }) {
  const [policy, setPolicy] = useState(POLICIES[0]);
  const [magnitude, setMagnitude] = useState(10);
  const [horizon, setHorizon] = useState(12);

  const sim = useMutation({
    mutationFn: () =>
      runPolicySimulation({
        policy,
        parameters: { magnitude, horizonMonths: horizon, district: filters.district },
      }),
  });

  const impact = sim.data?.projectedImpact;

  return (
    <section className="border-t border-border">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <span className="label-official text-xs">Policy Simulation</span>
        <span className="label-meta">Advisory projection</span>
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="bg-card p-4">
          <label className="block">
            <span className="label-meta">Intervention</span>
            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              className="mt-1 h-9 w-full border border-input bg-background px-2 font-mono text-[11px] outline-none focus:border-gold/60 focus:ring-1 focus:ring-ring"
            >
              {POLICIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className="label-meta">
              Magnitude · <span className="font-mono text-gold">{magnitude}</span>
            </span>
            <input
              type="range"
              min={1}
              max={100}
              value={magnitude}
              onChange={(e) => setMagnitude(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-gold)]"
              aria-label="Intervention magnitude"
            />
          </label>

          <label className="mt-3 block">
            <span className="label-meta">
              Horizon · <span className="font-mono text-gold">{horizon} months</span>
            </span>
            <input
              type="range"
              min={3}
              max={60}
              step={3}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-gold)]"
              aria-label="Projection horizon in months"
            />
          </label>

          <button
            onClick={() => sim.mutate()}
            disabled={sim.isPending}
            className="btn-exec mt-4 flex w-full items-center justify-center gap-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-60"
          >
            {sim.isPending ? (
              <>
                <FlaskConical className="size-3.5 animate-pulse" />
                Modelling…
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Run Simulation
              </>
            )}
          </button>

          <div className="mt-3 flex gap-2 border border-khaki/35 bg-khaki/5 p-2">
            <Info className="mt-0.5 size-3 shrink-0 text-khaki" />
            <p className="label-meta !text-[9px] !normal-case">
              Simulation is advisory only. Projections are estimated by the runtime from historical
              trends; final decisions remain with policymakers.
            </p>
          </div>
        </div>

        <div className="min-w-0 bg-card">
          {sim.isError ? (
            <div className="p-4">
              <GovErrorState onRetry={() => sim.mutate()} />
            </div>
          ) : !sim.data ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center p-6 text-center">
              <FlaskConical className="size-6 text-gold/70" />
              <p className="mt-3 max-w-xs text-xs text-muted-foreground">
                Select an intervention and run the simulation to see projected statewide impact,
                budget requirement and confidence.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-5">
                {[
                  ["Crime Reduction", `${impact!.crimeReductionPct}%`, "text-success"],
                  ["Budget Impact", `₹${impact!.budgetImpactCr} Cr`, "text-gold"],
                  ["Officers Required", impact!.officerRequirement.toLocaleString("en-IN"), "text-primary"],
                  ["Districts", String(impact!.affectedDistricts), "text-foreground"],
                  ["Confidence", `${sim.data.confidence}%`, "text-gold"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="bg-card px-3 py-2.5">
                    <div className="label-meta truncate">{label}</div>
                    <div className={`mt-1 font-mono text-sm ${tone}`}>{value}</div>
                  </div>
                ))}
              </div>

              <VizGrid charts={sim.data.visualizations} />

              <div className="border-t border-border p-4">
                <div className="label-tech">Supporting Evidence</div>
                <ul className="mt-2 space-y-1">
                  {sim.data.supportingEvidence.map((e) => (
                    <li key={e} className="flex gap-2 text-[11px] text-muted-foreground">
                      <span className="mt-1.5 size-1 shrink-0 bg-primary" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
                <p className="label-meta mt-3 !text-[9px] !normal-case">{sim.data.advisory}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
