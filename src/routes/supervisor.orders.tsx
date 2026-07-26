import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Check, Send, Pencil } from "lucide-react";
import { OperationalTimeline } from "@/components/supervisor/OpsCharts";
import { OpsErrorState, OpsSkeleton } from "@/components/supervisor/OpsStatePanels";
import { issueDirective, ordersQuery } from "@/lib/decision-api";
import { useSupervisorScope } from "@/lib/supervisor-scope";
import type { IssuedOrder } from "@/lib/decision-types";

export const Route = createFileRoute("/supervisor/orders")({
  head: () => ({
    meta: [
      { title: "Orders & Directives — CORTEX Supervisor" },
      {
        name: "description",
        content:
          "Review, edit, approve and issue operational directives for Karnataka State Police districts. Every order is logged with a timestamp.",
      },
      { property: "og:title", content: "Orders & Directives — CORTEX Supervisor" },
      {
        property: "og:description",
        content: "AI-drafted operational directives under supervisor authority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersDirectives,
});

function OrdersDirectives() {
  const { district } = useSupervisorScope();
  const orders = useQuery(ordersQuery(district));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [issued, setIssued] = useState<Record<string, IssuedOrder>>({});
  const [editing, setEditing] = useState<string | null>(null);

  const issue = useMutation({
    mutationFn: issueDirective,
    onSuccess: (order) => setIssued((prev) => ({ ...prev, [order.orderId]: order })),
  });

  if (orders.isLoading) return <OpsSkeleton rows={12} />;
  if (orders.isError || !orders.data)
    return (
      <div className="p-4">
        <OpsErrorState onRetry={() => orders.refetch()} />
      </div>
    );

  const data = orders.data;

  return (
    <div className="grid gap-px bg-border xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-px bg-border">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3">
          <div className="min-w-0">
            <h1 className="label-official flex items-center gap-2 text-sm">
              <ClipboardList className="size-4 text-gold" />
              Orders &amp; Directives — {data.district}
            </h1>
            <p className="label-meta mt-1">
              AI-generated drafts · the Supervisor reviews, edits, approves and issues
            </p>
          </div>
        </header>

        {data.drafts.map((d) => {
          const body = edits[d.id] ?? d.body;
          const isIssued = Boolean(issued[d.id]);
          return (
            <article key={d.id} className="bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-khaki">
                  {d.id} · {d.target}
                </span>
                <span
                  className={`font-mono text-[9px] uppercase ${
                    d.priority === "Immediate"
                      ? "text-maroon"
                      : d.priority === "High"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                >
                  {d.priority}
                </span>
              </div>
              <h2 className="mt-1 font-display text-sm font-semibold text-foreground">{d.title}</h2>

              {editing === d.id ? (
                <textarea
                  value={body}
                  onChange={(e) => setEdits((p) => ({ ...p, [d.id]: e.target.value }))}
                  rows={4}
                  className="mt-2 w-full resize-none border border-input bg-background p-2 text-[11px] text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-ring"
                />
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.basis.map((b) => (
                  <span
                    key={b}
                    className="border border-khaki/25 px-1.5 py-0.5 font-mono text-[9px] text-khaki"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setEditing(editing === d.id ? null : d.id)}
                  disabled={isIssued}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <Pencil className="size-3" />
                  {editing === d.id ? "Done" : "Edit"}
                </button>
                <button
                  onClick={() => setApproved((p) => ({ ...p, [d.id]: true }))}
                  disabled={isIssued || approved[d.id]}
                  className="inline-flex items-center gap-1.5 border border-primary/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  <Check className="size-3" />
                  {approved[d.id] ? "Approved" : "Approve"}
                </button>
                <button
                  onClick={() =>
                    issue.mutate({ orderId: d.id, title: d.title, target: d.target })
                  }
                  disabled={!approved[d.id] || isIssued || issue.isPending}
                  className="btn-exec inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-40"
                >
                  <Send className="size-3" />
                  Issue Order
                </button>
                {isIssued && (
                  <span className="font-mono text-[10px] text-success">
                    Issued {new Date(issued[d.id].timestamp).toISOString().slice(11, 16)} ·{" "}
                    {issued[d.id].approvalStatus}
                  </span>
                )}
              </div>
            </article>
          );
        })}

        {issue.isError && (
          <div className="bg-card p-4">
            <OpsErrorState message="Unable to issue the directive." onRetry={() => issue.reset()} />
          </div>
        )}
      </div>

      <div>
        <OperationalTimeline events={data.log} />
      </div>
    </div>
  );
}
