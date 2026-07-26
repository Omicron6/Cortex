import { useEffect, useState } from "react";
import {
  BadgeCheck,
  FileText,
  Radio,
  ShieldAlert,
  Siren,
  Users,
  History,
  MapPin,
  Megaphone,
  ClipboardCheck,
} from "lucide-react";
import type { DecisionBrief } from "@/lib/decision-types";

const bandTone: Record<string, string> = {
  severe: "text-maroon border-maroon/50",
  elevated: "text-warning border-warning/45",
  moderate: "text-khaki border-khaki/45",
  low: "text-success border-success/45",
};

const SECTIONS = [
  "Situation Summary",
  "Threat Assessment",
  "Historical Similar Events",
  "Crime Intelligence",
  "Resource Availability",
  "Deployment Recommendation",
  "Patrol Recommendations",
  "Sensitive Locations",
  "Emergency Response Plan",
  "Communication Strategy",
  "Risk, Confidence & Evidence",
] as const;

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border px-3 py-2.5">
      <div className="label-official flex items-center gap-1.5 text-[11px]">
        {Icon && <Icon className="size-3 text-gold" />}
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground">
          <span className="text-khaki">·</span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

/** Right-hand operational briefing. Renders runtime output section by section. */
export function DecisionBriefPanel({
  brief,
  pending,
}: {
  brief: DecisionBrief | null;
  pending: boolean;
}) {
  const [revealed, setRevealed] = useState<number>(SECTIONS.length);

  useEffect(() => {
    if (!brief) return;
    setRevealed(1);
    const id = window.setInterval(
      () =>
        setRevealed((r) => {
          if (r >= SECTIONS.length) {
            window.clearInterval(id);
            return r;
          }
          return r + 1;
        }),
      140,
    );
    return () => window.clearInterval(id);
  }, [brief]);

  if (pending) {
    return (
      <aside className="bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <span className="label-official text-xs">Decision Brief</span>
        </div>
        <div className="space-y-3 p-3">
          {SECTIONS.slice(0, 6).map((s) => (
            <div key={s}>
              <div className="label-meta">{s}</div>
              <div className="mt-1.5 space-y-1.5">
                <div className="h-3 w-full animate-pulse bg-surface/60" />
                <div className="h-3 w-4/5 animate-pulse bg-surface/50" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (!brief) {
    return (
      <aside className="bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <span className="label-official text-xs">Decision Brief</span>
        </div>
        <div className="p-3">
          <div className="border border-dashed border-border p-4 text-center">
            <FileText className="mx-auto size-5 text-khaki/70" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              No brief generated. Describe an operational situation and the engine will return a
              full briefing for your review.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const show = (i: number) => revealed > i;
  const p = brief.deploymentPlan;

  return (
    <aside className="bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="label-official flex items-center gap-2 text-xs">
          <FileText className="size-3.5 text-gold" />
          Decision Brief
        </span>
        <span className="font-mono text-[10px] text-khaki">{brief.briefId}</span>
      </div>
      <div className="border-b border-border bg-gold/5 px-3 py-2">
        <div className="label-meta">
          {brief.district} · generated {new Date(brief.generatedAt).toISOString().slice(11, 16)} ·
          decision support only
        </div>
        <p className="mt-1 font-mono text-[10px] text-gold">“{brief.scenario}”</p>
      </div>

      {show(0) && (
        <Block title="Situation Summary" icon={ClipboardCheck}>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {brief.executiveSummary}
          </p>
        </Block>
      )}

      {show(1) && (
        <Block title="Threat Assessment" icon={ShieldAlert}>
          <div className={`border-l-2 pl-2 ${bandTone[brief.threatAssessment.band]}`}>
            <div className="font-display text-sm font-bold uppercase">
              {brief.threatAssessment.band} · {brief.threatAssessment.score}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {brief.threatAssessment.summary}
            </p>
          </div>
          <div className="mt-2">
            <Bullets items={brief.threatAssessment.factors} />
          </div>
        </Block>
      )}

      {show(2) && (
        <Block title="Historical Similar Events" icon={History}>
          <ul className="space-y-2">
            {brief.historicalSimilarEvents.map((h) => (
              <li key={h.id} className="border-l-2 border-khaki/40 pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-foreground">{h.name}</span>
                  <span className="font-mono text-[9px] text-khaki">{h.date}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Crowd {h.crowd.toLocaleString()} · {h.outcome}
                </p>
                <p className="text-[10px] text-ws">Lesson: {h.lesson}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {show(3) && (
        <Block title="Crime Intelligence" icon={Radio}>
          <ul className="space-y-1.5">
            {brief.crimeIntelligence.map((c) => (
              <li key={c.label}>
                <span className="font-mono text-[10px] text-ws">{c.label}</span>
                <p className="text-[10px] text-muted-foreground">{c.detail}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {show(4) && (
        <Block title="Resource Availability" icon={Users}>
          <div className="grid grid-cols-2 gap-px bg-border">
            {brief.resourceAvailability.map((r) => (
              <div key={r.label} className="bg-card px-2 py-1.5">
                <div className="label-meta !text-[9px]">{r.label}</div>
                <div className="font-mono text-sm text-foreground">{r.value}</div>
                <div className="text-[9px] text-muted-foreground">{r.note}</div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {show(5) && (
        <Block title="Deployment Recommendation" icon={Users}>
          <ul className="space-y-1">
            {p.personnel.map((x) => (
              <li key={x.role} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {x.role}
                </span>
                <span className="font-mono text-[10px] text-gold">{x.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 label-meta">Stations involved</div>
          <ul className="mt-1 space-y-1">
            {p.stations.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                  {s.name} · {s.commander}
                </span>
                <span className="font-mono text-[10px] text-ws">{s.contribution}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 label-meta">Reserve units</div>
          <div className="mt-1">
            <Bullets items={p.reserveUnits} />
          </div>
          <div className="mt-2 label-meta">Checkpoints</div>
          <ul className="mt-1 space-y-1">
            {p.checkpoints.map((c) => (
              <li key={c.id} className="text-[10px] text-muted-foreground">
                {c.location} · {c.window} · {c.strength} personnel
              </li>
            ))}
          </ul>
        </Block>
      )}

      {show(6) && (
        <Block title="Patrol Recommendations" icon={Siren}>
          <Bullets items={brief.patrolRecommendations} />
        </Block>
      )}

      {show(7) && (
        <Block title="Sensitive Locations" icon={MapPin}>
          <ul className="space-y-1">
            {brief.sensitiveLocations.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-[11px] text-foreground">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">{s.reason}</span>
                </span>
                <span
                  className={`shrink-0 font-mono text-[9px] uppercase ${bandTone[s.band].split(" ")[0]}`}
                >
                  {s.band}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {show(8) && (
        <Block title="Emergency Response Plan" icon={Siren}>
          <Bullets items={brief.emergencyResponsePlan} />
        </Block>
      )}

      {show(9) && (
        <Block title="Communication Strategy" icon={Megaphone}>
          <Bullets items={brief.communicationStrategy} />
        </Block>
      )}

      {show(10) && (
        <Block title="Risk, Confidence & Evidence" icon={BadgeCheck}>
          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-card px-2 py-1.5">
              <div className="label-meta !text-[9px]">Risk level</div>
              <div
                className={`font-display text-sm font-bold uppercase ${bandTone[brief.riskLevel.band].split(" ")[0]}`}
              >
                {brief.riskLevel.band} · {brief.riskLevel.score}
              </div>
            </div>
            <div className="bg-card px-2 py-1.5">
              <div className="label-meta !text-[9px]">Confidence</div>
              <div className="font-mono text-sm text-ws">{brief.confidence.toFixed(2)}</div>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5">
            {brief.evidence.map((e) => (
              <li key={e.id} className="border-l-2 border-ws/40 pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-foreground">{e.label}</span>
                  <span className="font-mono text-[9px] text-khaki">{e.id}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{e.detail}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {show(10) && (
        <Block title="AI Recommendations" icon={ClipboardCheck}>
          <ul className="space-y-2.5">
            {brief.recommendations.map((r) => (
              <li key={r.id} className="border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-khaki">{r.id}</span>
                  <span
                    className={`font-mono text-[9px] uppercase ${
                      r.priority === "Immediate"
                        ? "text-maroon"
                        : r.priority === "High"
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {r.priority}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-foreground">{r.action}</div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Reason: {r.reason}</p>
                <div className="mt-1 label-meta !text-[9px]">
                  Confidence {r.confidence.toFixed(2)}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {r.supportingIntelligence.map((s) => (
                    <li key={s} className="text-[10px] text-ws">
                      · {s}
                    </li>
                  ))}
                </ul>
                <ul className="mt-1 space-y-0.5">
                  {r.evidence.map((e) => (
                    <li key={e.id} className="text-[9px] text-muted-foreground">
                      {e.id} — {e.detail}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </aside>
  );
}
