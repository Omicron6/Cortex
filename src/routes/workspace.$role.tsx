import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { AppShell } from "@/components/cortex/AppShell";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { IntelligenceCore } from "@/components/cortex/IntelligenceCore";
import { WORKSPACE_CONTENT, getWorkspace, type RoleId } from "@/lib/cortex-data";
import { readSession, useHydrated } from "@/lib/cortex-session";

export const Route = createFileRoute("/workspace/$role")({
  head: () => ({
    meta: [
      { title: "Operational Workspace — CORTEX" },
      {
        name: "description",
        content:
          "Role-aware CORTEX workspace surfacing explainable AI intelligence over Karnataka State Police crime records.",
      },
      { property: "og:title", content: "Operational Workspace — CORTEX" },
      {
        property: "og:description",
        content: "Explainable crime intelligence, bound to your operational role.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceView,
});

const toneText: Record<string, string> = {
  primary: "text-ws",
  success: "text-success",
  warning: "text-warning",
  critical: "text-maroon",
};

function WorkspaceView() {
  const { role } = useParams({ from: "/workspace/$role" });
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const workspace = getWorkspace(role);
  const [active, setActive] = useState(workspace?.nav[0].label ?? "");

  useEffect(() => {
    if (!workspace) {
      navigate({ to: "/console", replace: true });
      return;
    }
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [workspace, hydrated, navigate]);

  if (!workspace) return null;
  const content = WORKSPACE_CONTENT[workspace.id as RoleId];
  const maxTrend = Math.max(...content.trend.map((t) => t.value));

  return (
    <AppShell workspace={workspace} active={active} onSelect={setActive}>
      <div className="border-b border-border bg-card/50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="font-display text-lg font-semibold">{active}</h1>
              <span className="font-mono text-[11px] text-ws">{workspace.engine}</span>
            </div>
            <div className="label-meta mt-1">
              Session · {new Date().toISOString().slice(0, 10)} · Clearance L3 · {workspace.code}
            </div>
          </div>
          <button className="btn-exec ml-auto h-9 px-4">
            <FileDown className="size-3.5" />
            Generate Report
          </button>
        </div>
        <div className="ksp-rule mt-3 h-px w-24 opacity-70" />
      </div>

      <div className="grid grid-cols-1 gap-px bg-border xl:grid-cols-[1fr_340px]">
        <div className="bg-background">
          {/* Metrics */}
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {content.metrics.map((m) => (
              <div key={m.label} className="card-intel border-0 px-4 py-4">
                <div className="label-meta">{m.label}</div>
                <div className={`mt-3 font-mono text-2xl ${toneText[m.tone]}`}>{m.value}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{m.delta}</div>
              </div>
            ))}
          </div>

          {/* Table + trend */}
          <div className="grid gap-px bg-border lg:grid-cols-[1.35fr_1fr]">
            <section className="bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="label-official text-xs">{content.table.title}</span>
                <span className="label-meta">SCRB · live</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {content.table.columns.map((c) => (
                      <th key={c} className="label-tech px-4 py-2 text-left font-normal">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.table.rows.map((row) => (
                    <tr
                      key={row[0]}
                      className="group border-b border-khaki/12 transition-colors hover:bg-primary/8"
                    >
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={`whitespace-nowrap px-4 py-2.5 font-mono text-[11px] ${
                            i === 0
                              ? "text-foreground group-hover:text-primary"
                              : i === 3
                                ? "text-gold"
                                : "text-muted-foreground"
                          }`}

                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="label-official text-xs">Trend Signal</span>
                <span className="label-meta">QuickML</span>
              </div>
              <div className="flex h-56 items-end gap-2 px-4 pb-4 pt-6">
                {content.trend.map((t) => (
                  <div key={t.label} className="group flex h-full flex-1 flex-col items-center gap-2">
                    <div className="flex h-full w-full items-end">
                      <div
                        className="w-full border-t-2 border-ws bg-ws/18 transition-colors group-hover:bg-ws/30"
                        style={{ height: `${(t.value / maxTrend) * 100}%` }}
                      />
                    </div>

                    <span className="label-meta !text-[9px]">{t.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* AI reasoning trace */}
          <section className="bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="label-official text-xs">AI Reasoning Trace</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary">
                <span className="size-1.5 animate-pulse-node rounded-full bg-primary" />
                REASONING ACTIVE
              </span>
            </div>
            <ol className="divide-y divide-khaki/12">
              {content.reasoning.map((r, i) => (
                <li key={r.step} className="flex gap-4 px-4 py-3">
                  <span className="font-mono text-[11px] text-khaki">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-semibold">{r.step}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="label-meta !text-[9px]">Confidence</div>
                    <div className="font-mono text-xs text-success">{r.confidence}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="border-t border-border px-4 py-2.5">
              <span className="label-meta">
                Every inference links to source FIR records · audit id CTX-TR-
                {workspace.code.replace("WS-", "")}
              </span>
            </div>
          </section>
        </div>

        {/* Right rail */}
        <aside className="grid content-start gap-px bg-border">
          <div className="relative overflow-hidden bg-card p-4">
            <div className="label-official text-xs">Runtime Core</div>
            <div className="flex justify-center py-2">
              <IntelligenceCore size={260} compact mode="thinking" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="label-meta">KG 8.42M edges</span>
              <span className="font-mono text-[10px] text-success">STABLE</span>
            </div>
          </div>

          <div className="bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <span className="label-official text-xs">Priority Queue</span>
            </div>
            <ul className="divide-y divide-khaki/12">
              {content.queue.map((q) => (
                <li key={q.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-ws">{q.id}</span>
                    <span className={`font-mono text-[10px] uppercase ${toneText[q.tone]}`}>
                      {q.state}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{q.label}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden bg-card p-4">
            <div className="absolute inset-0 text-primary/18">
              <GraphBackdrop nodes={18} className="h-full w-full" />
            </div>
            <div className="relative">
              <div className="label-official text-xs">Graph Activity</div>
              <div className="mt-16 label-meta">
                Live edge formation · last 60s
              </div>
              <div className="mt-1 font-mono text-lg text-ws">+1,284</div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
