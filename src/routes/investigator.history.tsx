import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { historyQuery } from "@/lib/investigation-api";
import { PanelSkeleton, RuntimeErrorState } from "@/components/investigator/StatePanels";

export const Route = createFileRoute("/investigator/history")({
  head: () => ({
    meta: [
      { title: "Investigation History — CORTEX" },
      {
        name: "description",
        content:
          "Previous copilot conversations, generated reports and export trail for Karnataka State Police investigations.",
      },
      { property: "og:title", content: "Investigation History — CORTEX" },
      { property: "og:description", content: "Audit trail of copilot conversations and reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { caseId } = Route.useSearch();
  const history = useQuery(historyQuery(caseId));

  return (
    <div className="p-4">
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold">Investigation History</h1>
          <div className="label-meta mt-1">
            {caseId ? `Filtered to case ${caseId}` : "All assigned investigations"}
          </div>
        </div>
        <button className="btn-exec h-9 px-4">
          <FileDown className="size-3.5" />
          Export
        </button>
      </header>
      <div className="ksp-rule mb-4 h-px w-24 opacity-70" />

      {history.isLoading ? (
        <PanelSkeleton rows={6} />
      ) : history.isError ? (
        <RuntimeErrorState onRetry={() => history.refetch()} />
      ) : history.data?.length === 0 ? (
        <div className="border border-dashed border-border p-8 text-center">
          <div className="label-official text-xs">No conversations recorded</div>
          <p className="mt-2 text-xs text-muted-foreground">
            Copilot sessions for this investigation will appear here once recorded by the runtime.
          </p>
        </div>
      ) : (
        <ul className="grid gap-px bg-border">
          {history.data?.map((h) => (
            <li key={h.id} className="bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-[11px] text-ws">{h.id}</span>
                <span className="label-meta">{new Date(h.timestamp).toLocaleString()}</span>
                <span className="label-meta">{h.officer}</span>
                <span className="label-meta">{h.caseId}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{h.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {h.reports.map((r) => (
                  <span
                    key={r}
                    className="border border-gold/45 bg-gold/8 px-2 py-0.5 font-mono text-[10px] text-gold"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
