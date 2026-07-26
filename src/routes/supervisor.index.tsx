import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdiePanel } from "@/components/supervisor/AdiePanel";
import { DecisionBriefPanel } from "@/components/supervisor/DecisionBriefPanel";
import { DistrictContextPanel } from "@/components/supervisor/DistrictContextPanel";
import { DistrictMap } from "@/components/supervisor/DistrictMap";
import { OperationalTimeline } from "@/components/supervisor/OpsCharts";
import { OpsErrorState, OpsSkeleton, ScenarioEmptyState } from "@/components/supervisor/OpsStatePanels";
import { districtOverviewQuery, threatsQuery } from "@/lib/decision-api";
import { useSupervisorScope } from "@/lib/supervisor-scope";
import type { DecisionBrief } from "@/lib/decision-types";

export const Route = createFileRoute("/supervisor/")({
  head: () => ({
    meta: [
      { title: "Decision Workspace — CORTEX Supervisor Command" },
      {
        name: "description",
        content:
          "Adaptive Decision Intelligence Engine for Karnataka State Police supervisors — scenario-driven deployment recommendations, threat assessment and operational briefs.",
      },
      { property: "og:title", content: "Decision Workspace — CORTEX Supervisor Command" },
      {
        property: "og:description",
        content:
          "District command and control: describe an operational situation, receive an explainable decision brief.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DecisionWorkspace,
});

const SUGGESTIONS = [
  "There is a political rally tomorrow in Mysuru with an expected crowd of 60,000.",
  "There is increasing communal tension in Mangalore.",
  "A cyclone warning has been issued for Udupi.",
  "Cyber fraud has increased significantly in Bengaluru East.",
  "Prepare security for an IPL match at Chinnaswamy Stadium.",
];

function DecisionWorkspace() {
  const { district, search, setValue } = useSupervisorScope();
  const overview = useQuery(districtOverviewQuery(district));
  const threats = useQuery(threatsQuery(district));
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [pending, setPending] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();

  const onPendingChange = useCallback((p: boolean) => setPending(p), []);
  const onBrief = useCallback((b: DecisionBrief | null) => setBrief(b), []);

  const mapLayers = brief?.mapLayers ?? threats.data?.mapLayers ?? [];

  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <div className="order-2 lg:order-1">
        {overview.isLoading ? (
          <OpsSkeleton rows={12} />
        ) : overview.isError || !overview.data ? (
          <div className="p-4">
            <OpsErrorState onRetry={() => overview.refetch()} />
          </div>
        ) : (
          <DistrictContextPanel
            data={overview.data}
            district={district}
            activeTemplate={search.template}
            onDistrictChange={(d) => setValue("district", d)}
            onTemplate={(id, scenario) => {
              setValue("template", id);
              setPreset(scenario);
            }}
          />
        )}
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <AdiePanel
          district={district}
          presetScenario={preset}
          onBrief={onBrief}
          onPendingChange={onPendingChange}
        />

        <section className="border-t border-border">
          {!brief && !pending ? (
            <div className="p-4">
              <ScenarioEmptyState
                suggestions={SUGGESTIONS}
                onSelect={(s) => setPreset(s)}
              />
            </div>
          ) : null}

          {mapLayers.length > 0 ? (
            <DistrictMap layers={mapLayers} title={`${district} — Operational Picture`} />
          ) : (
            <OpsSkeleton rows={6} />
          )}
        </section>

        {brief && (
          <section className="border-t border-border">
            <OperationalTimeline events={brief.timeline} />
          </section>
        )}
      </div>

      <div className="order-3">
        <DecisionBriefPanel brief={brief} pending={pending} />
      </div>
    </div>
  );
}
