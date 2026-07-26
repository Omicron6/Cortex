import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CaseContextPanel } from "@/components/investigator/CaseContextPanel";
import { CopilotPanel } from "@/components/investigator/CopilotPanel";
import { EvidencePanel } from "@/components/investigator/EvidencePanel";
import { EmptyInvestigation } from "@/components/investigator/StatePanels";
import { casesQuery } from "@/lib/investigation-api";

export const Route = createFileRoute("/investigator/")({
  head: () => ({
    meta: [
      { title: "Investigation Workspace — CORTEX Investigator" },
      {
        name: "description",
        content:
          "Adaptive Investigation Copilot for Karnataka State Police investigating officers — case context, AI reasoning and evidence intelligence in one console.",
      },
      { property: "og:title", content: "Investigation Workspace — CORTEX Investigator" },
      {
        property: "og:description",
        content: "Voice-first AI copilot beside the investigating officer.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestigationWorkspace,
});

function InvestigationWorkspace() {
  const { caseId } = Route.useSearch();
  const navigate = useNavigate();
  const cases = useQuery(casesQuery());

  const setCase = (next: string) =>
    navigate({ to: "/investigator", search: next ? { caseId: next } : {} });

  const go = (to: "/investigator/cin" | "/investigator/bip" | "/investigator/history") =>
    navigate({ to, search: caseId ? { caseId } : {} });

  const handleAction = (actionId: string) => {
    if (actionId === "open-cin" || actionId === "find-associates") return go("/investigator/cin");
    if (actionId === "open-bip") return go("/investigator/bip");
    if (actionId === "generate-report" || actionId === "generate-timeline")
      return go("/investigator/history");
  };

  if (!caseId) {
    return (
      <div className="p-6">
        <EmptyInvestigation
          onSelect={() => {
            const first = cases.data?.[0]?.caseId;
            if (first) setCase(first);
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-px bg-border lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <div className="order-2 lg:order-1">
        <CaseContextPanel caseId={caseId} onSelectCase={setCase} />
      </div>
      <div className="order-1 lg:order-2">
        <CopilotPanel caseId={caseId} onAction={handleAction} />
      </div>
      <div className="order-3">
        <EvidencePanel caseId={caseId} onAction={handleAction} />
      </div>
    </div>
  );
}
