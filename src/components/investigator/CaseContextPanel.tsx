import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { caseQuery, casesQuery, timelineQuery } from "@/lib/investigation-api";
import { PanelSkeleton, RuntimeErrorState } from "./StatePanels";

const toneText: Record<string, string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
};

const priorityTone: Record<string, string> = {
  Critical: "text-maroon border-maroon/50 bg-maroon/10",
  High: "text-gold border-gold/50 bg-gold/10",
  Medium: "text-primary border-primary/40 bg-primary/10",
  Low: "text-muted-foreground border-border",
};

interface Props {
  caseId?: string;
  onSelectCase: (caseId: string) => void;
}

export function CaseContextPanel({ caseId, onSelectCase }: Props) {
  const cases = useQuery(casesQuery());
  const detail = useQuery(caseQuery(caseId ?? ""));
  const timeline = useQuery(timelineQuery(caseId ?? ""));

  return (
    <div className="flex h-full flex-col divide-y divide-border bg-card">
      <section>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="label-official text-xs">Active Investigation</span>
          <span className="label-meta">SCRB</span>
        </div>

        <div className="relative px-4 py-3">
          <label className="label-meta" htmlFor="case-select">
            Assigned cases
          </label>
          {cases.isLoading ? (
            <PanelSkeleton rows={2} />
          ) : cases.isError ? (
            <div className="mt-2">
              <RuntimeErrorState onRetry={() => cases.refetch()} />
            </div>
          ) : (
            <div className="relative mt-2">
              <select
                id="case-select"
                value={caseId ?? ""}
                onChange={(e) => onSelectCase(e.target.value)}
                className="h-9 w-full appearance-none border border-input bg-background px-3 pr-8 font-mono text-[11px] text-foreground outline-none focus:border-primary/60"
              >
                <option value="">Select investigation…</option>
                {cases.data?.map((c) => (
                  <option key={c.caseId} value={c.caseId}>
                    {c.firNumber} · {c.crimeType}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-3.5 text-primary/70" />
            </div>
          )}
        </div>

        {caseId &&
          (detail.isLoading ? (
            <PanelSkeleton rows={6} />
          ) : detail.isError ? (
            <div className="px-4 pb-4">
              <RuntimeErrorState onRetry={() => detail.refetch()} />
            </div>
          ) : detail.data ? (
            <dl className="divide-y divide-khaki/12 border-t border-border">
              {[
                ["FIR Number", detail.data.firNumber],
                ["Crime Type", detail.data.crimeType],
                ["Police Station", detail.data.station],
                ["Investigating Officer", detail.data.officer],
                ["Status", detail.data.status],
                ["Date Registered", new Date(detail.data.registeredAt).toLocaleString()],
                ["Location", detail.data.location],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 px-4 py-2">
                  <dt className="label-meta w-32 shrink-0">{k}</dt>
                  <dd className="min-w-0 flex-1 font-mono text-[11px] text-foreground">{v}</dd>
                </div>
              ))}
              <div className="flex items-center gap-3 px-4 py-2">
                <dt className="label-meta w-32 shrink-0">Priority</dt>
                <dd>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                      priorityTone[detail.data.priority]
                    }`}
                  >
                    {detail.data.priority}
                  </span>
                </dd>
              </div>
            </dl>
          ) : null)}
      </section>

      {caseId && detail.data && (
        <section>
          <div className="border-b border-border px-4 py-2.5">
            <span className="label-official text-xs">Case Statistics</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border">
            {[
              ["Evidence", detail.data.statistics.evidence],
              ["Witnesses", detail.data.statistics.witnesses],
              ["Accused", detail.data.statistics.accused],
              ["Victims", detail.data.statistics.victims],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-card px-4 py-3">
                <div className="label-meta">{label}</div>
                <div className="mt-1 font-mono text-lg text-ws">
                  {String(value).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseId && (
        <section className="flex-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="label-official text-xs">Timeline Preview</span>
            <span className="label-meta">Latest activity</span>
          </div>
          {timeline.isLoading ? (
            <PanelSkeleton rows={5} />
          ) : timeline.isError ? (
            <div className="p-4">
              <RuntimeErrorState onRetry={() => timeline.refetch()} />
            </div>
          ) : (
            <ol className="divide-y divide-khaki/12">
              {timeline.data?.map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-[10px] uppercase ${toneText[e.tone]}`}>
                      {e.title}
                    </span>
                    <span className="label-meta !text-[9px] shrink-0">{e.at}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{e.detail}</p>
                  <div className="label-meta !text-[9px] mt-1">{e.actor}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
