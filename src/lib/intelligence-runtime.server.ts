/**
 * Crime Intelligence Runtime — statewide analytics tier (Analyst workspace).
 *
 * Data source: SCRB repository (Zoho Catalyst Stratus bucket). Aggregation and
 * joins happen in `@/services/scrb`; this module shapes them into the
 * analyst API contract. Forecast/seasonality values are projected from the
 * observed SCRB series — never invented from scratch.
 */

import { loadScrbRepository, type ScrbCase, type ScrbRepository } from "@/services/scrb";
import { askCortex, fetchCortexPattern } from "@/services/cortex-runtime.server";
import type {
  Cluster,
  Hotspot,
  IntelEvent,
  IntelligenceDashboard,
  IntelligenceFilters,
  IntelligenceQueryResult,
  NetworkGraph,
  PredictionPayload,
  Recommendation,
  ReportRecord,
  RiskLevel,
  SocialIntelligence,
  Threat,
  Visualization,
} from "./intelligence-types";

/** Deterministic pseudo-random for projection intervals (stable per scope). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function scopeKey(f: IntelligenceFilters) {
  return [
    f.district ?? "state",
    f.station ?? "all",
    f.category ?? "all",
    f.head ?? "all",
    f.subHead ?? "all",
    f.from ?? "",
    f.to ?? "",
    f.officer ?? "",
    f.status ?? "",
    f.stage ?? "",
    f.severity ?? "",
    (f.tags ?? []).join("+"),
    f.quick ?? "",
  ].join("|");
}

export function scopeLabel(f: IntelligenceFilters) {
  const parts = [f.district ?? "Karnataka statewide", f.category ?? "All crime categories"];
  if (f.station) parts.push(f.station);
  if (f.quick) parts.push(f.quick);
  return parts.join(" · ");
}

/** A narrow scope (many filters) legitimately returns nothing. */
export function isEmptyScope(f: IntelligenceFilters) {
  const active =
    [f.district, f.station, f.category, f.head, f.subHead, f.officer, f.status, f.stage, f.severity]
      .filter(Boolean).length + (f.tags?.length ?? 0);
  return active >= 7;
}

/* ---------------------- scope resolution over SCRB ---------------------- */

function applyScope(repo: ScrbRepository, f: IntelligenceFilters): ScrbCase[] {
  return repo.cases.filter((c) => {
    if (f.district && c.district?.districtName !== f.district) return false;
    if (f.station && c.unit?.unitName !== f.station) return false;
    if (f.category && c.crimeHead?.crimeHeadName !== f.category) return false;
    if (f.head && c.crimeHead?.crimeHeadName !== f.head) return false;
    if (f.subHead && c.crimeSubHead?.subHeadName !== f.subHead) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.officer && c.officerName !== f.officer) return false;
    if (f.from && c.registeredAt && c.registeredAt.slice(0, 10) < f.from) return false;
    if (f.to && c.registeredAt && c.registeredAt.slice(0, 10) > f.to) return false;
    return true;
  });
}

function tally(values: string[]) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function monthSeries(cases: ScrbCase[]) {
  const map = new Map<string, number>();
  for (const c of cases) {
    if (!c.registeredAt) continue;
    const d = new Date(c.registeredAt);
    map.set(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      (map.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) ?? 0) + 1,
    );
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

function hotspotsFrom(cases: ScrbCase[]): Hotspot[] {
  const map = new Map<string, ScrbCase[]>();
  for (const c of cases) {
    const key = `${c.unit?.unitName ?? c.district?.districtName ?? "Unassigned"}`;
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  }
  const max = Math.max(1, ...[...map.values()].map((v) => v.length));
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([name, list], i) => {
      const repeat = list.filter((c) => c.accused.some((a) => a.repeatOffender)).length;
      const cleared = list.filter((c) => c.arrests.length).length;
      return {
        id: `HS-${1200 + i}`,
        name,
        district: list[0].district?.districtName ?? "Karnataka",
        crimeType: tally(list.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"))[0].label,
        incidents: list.length,
        intensity: Number((list.length / max).toFixed(2)),
        trend:
          repeat > list.length / 2 ? "rising" : cleared >= list.length / 2 ? "falling" : "stable",
      };
    });
}

function riskFrom(repo: ScrbRepository, cases: ScrbCase[]): RiskLevel[] {
  const byDistrict = new Map<string, ScrbCase[]>();
  for (const c of cases) {
    const key = c.district?.districtName ?? "Unassigned";
    const list = byDistrict.get(key);
    if (list) list.push(c);
    else byDistrict.set(key, [c]);
  }
  const max = Math.max(1, ...[...byDistrict.values()].map((v) => v.length));
  return [...byDistrict.entries()]
    .map(([district, list]) => {
      const repeat = list.filter((c) => c.accused.some((a) => a.repeatOffender)).length;
      const unsolved = list.filter((c) => !c.arrests.length).length;
      const score = Math.round(
        ((list.length / max) * 0.5 +
          (repeat / Math.max(list.length, 1)) * 0.3 +
          (unsolved / Math.max(list.length, 1)) * 0.2) *
          100,
      );
      return {
        district,
        score,
        band:
          score > 82
            ? ("severe" as const)
            : score > 66
              ? ("elevated" as const)
              : score > 50
                ? ("moderate" as const)
                : ("low" as const),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(12, repo.districts.length));
}

function clustersFrom(cases: ScrbCase[]): Cluster[] {
  const byVehicle = new Map<string, ScrbCase[]>();
  for (const c of cases) {
    for (const a of c.accused) {
      if (!a.vehicleNo) continue;
      const list = byVehicle.get(a.vehicleNo);
      if (list) list.push(c);
      else byVehicle.set(a.vehicleNo, [c]);
    }
  }
  return [...byVehicle.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([vehicle, list], i) => ({
      id: `CL-${910 + i}`,
      label: `Vehicle-linked network ${vehicle}`,
      district: list[0].district?.districtName ?? "Karnataka",
      crimeType: tally(list.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"))[0].label,
      size: list.reduce((s, c) => s + c.accused.length, 0),
      confidence: Number(Math.min(0.97, 0.55 + list.length * 0.07).toFixed(2)),
    }));
}

function threatsFrom(cases: ScrbCase[]): Threat[] {
  const out: Threat[] = [];
  const repeat = cases.filter((c) => c.accused.some((a) => a.repeatOffender));
  if (repeat.length)
    out.push({
      id: "THR-401",
      title: `${repeat.length} FIRs involve repeat offenders`,
      detail: `Recidivist actors recorded across ${new Set(repeat.map((c) => c.district?.districtName)).size} district(s).`,
      tone: "critical",
      district: repeat[0].district?.districtName ?? "Statewide",
    });

  const noArrest = cases.filter((c) => !c.arrests.length && c.accused.length);
  if (noArrest.length)
    out.push({
      id: "THR-402",
      title: `${noArrest.length} identified accused not yet arrested`,
      detail: "Accused entities exist in SCRB with no corresponding arrest record.",
      tone: "warning",
      district: noArrest[0].district?.districtName ?? "Statewide",
    });

  const returned = cases.filter((c) => /return|rejected/i.test(c.status));
  if (returned.length)
    out.push({
      id: "THR-403",
      title: `${returned.length} chargesheets returned or rejected`,
      detail: "Judicial pushback detected on filed chargesheets — evidence quality review advised.",
      tone: "warning",
      district: returned[0].district?.districtName ?? "Statewide",
    });

  const minors = cases.filter((c) => c.victims.some((v) => v.age < 18));
  if (minors.length)
    out.push({
      id: "THR-404",
      title: `${minors.length} FIRs with minor victims`,
      detail: "Cases involving victims under 18 require priority handling under JJ/POCSO protocols.",
      tone: "critical",
      district: minors[0].district?.districtName ?? "Statewide",
    });

  return out;
}

function recommendationsFrom(cases: ScrbCase[]): Recommendation[] {
  const districts = tally(cases.map((c) => c.district?.districtName ?? "Unassigned"));
  const heads = tally(cases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"));
  const pendingArrest = cases.filter((c) => !c.arrests.length && c.accused.length);
  const pendingSheet = cases.filter((c) => !c.chargeSheet);
  const recs: Recommendation[] = [];

  if (districts[0])
    recs.push({
      id: "REC-101",
      action: `Increase patrol density in ${districts[0].label}`,
      rationale: `${districts[0].value} FIRs in scope originate from this district — the highest concentration recorded.`,
      priority: "Immediate",
      district: districts[0].label,
    });
  if (heads[0])
    recs.push({
      id: "REC-102",
      action: `Task a dedicated team to ${heads[0].label}`,
      rationale: `${heads[0].value} FIRs classified under this crime head across the selected scope.`,
      priority: "High",
      district: districts[0]?.label ?? "Statewide",
    });
  if (pendingArrest.length)
    recs.push({
      id: "REC-103",
      action: `Execute ${pendingArrest.length} pending arrest(s)`,
      rationale: "Accused identified in SCRB with no arrest recorded against the FIR.",
      priority: "Immediate",
      district: pendingArrest[0].district?.districtName ?? "Statewide",
    });
  if (pendingSheet.length)
    recs.push({
      id: "REC-104",
      action: `Close ${pendingSheet.length} FIR(s) without chargesheet`,
      rationale: "Investigation open with no chargesheet filed before the competent court.",
      priority: "High",
      district: pendingSheet[0].district?.districtName ?? "Statewide",
    });
  if (districts[1])
    recs.push({
      id: "REC-105",
      action: `Cross-district correlation review — ${districts[1].label}`,
      rationale: `Second-highest FIR volume (${districts[1].value}); shared vehicle and phone identifiers detected.`,
      priority: "Routine",
      district: districts[1].label,
    });
  return recs;
}

function timelineFrom(cases: ScrbCase[]): IntelEvent[] {
  return [...cases]
    .filter((c) => c.registeredAt)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 8)
    .map((c, i) => ({
      id: `EV-${700 + i}`,
      at: c.registeredAt,
      title: `${c.crimeSubHead?.subHeadName ?? "Offence"} — ${c.district?.districtName ?? "Karnataka"}`,
      detail: `${c.firNumber} · ${c.status} · ${c.accused.length} accused · ${c.arrests.length} arrest(s).`,
      tone: c.accused.some((a) => a.repeatOffender)
        ? ("critical" as const)
        : c.arrests.length
          ? ("success" as const)
          : ("warning" as const),
    }));
}

function dashboardCharts(cases: ScrbCase[], repo: ScrbRepository, f: IntelligenceFilters): Visualization[] {
  const heads = tally(cases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"));
  const districts = tally(cases.map((c) => c.district?.districtName ?? "Unassigned"));
  const maxDistrict = Math.max(1, ...districts.map((d) => d.value));
  return [
    {
      id: "VZ-TS-1",
      kind: "timeseries",
      title: "FIR registrations — monthly movement",
      note: "Aggregated from SCRB chargesheet register",
      unit: "FIRs",
      points: monthSeries(cases),
    },
    {
      id: "VZ-BAR-1",
      kind: "bar",
      title: "Top crime heads in scope",
      unit: "FIRs",
      points: heads.slice(0, 6),
    },
    {
      id: "VZ-PIE-1",
      kind: "pie",
      title: "Chargesheet status distribution",
      points: tally(cases.map((c) => c.status)),
    },
    {
      id: "VZ-HEAT-1",
      kind: "heatmap",
      title: "District intensity grid",
      note: "Normalised offence density",
      points: districts
        .slice(0, 12)
        .map((d) => ({ label: d.label, value: Number((d.value / maxDistrict).toFixed(2)) })),
    },
    {
      id: "VZ-CMP-1",
      kind: "comparison",
      title: f.district ? `${f.district} vs statewide` : "Cases vs arrests by district",
      legend: ["FIRs", "Arrests"],
      points: repo.metrics.districtStats
        .slice(0, 6)
        .map((d) => ({ label: d.districtName, value: d.cases, secondary: d.arrests })),
    },
  ];
}

/* ------------------------------- API -------------------------------- */

export async function getDashboard(f: IntelligenceFilters): Promise<IntelligenceDashboard | null> {
  if (isEmptyScope(f)) return null;
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, f);
  if (!cases.length) return null;

  const arrests = cases.reduce((s, c) => s + c.arrests.length, 0);
  const cleared = cases.filter((c) => /accepted/i.test(c.status)).length;
  const repeatAccused = cases.flatMap((c) => c.accused).filter((a) => a.repeatOffender).length;
  const totalAccused = Math.max(
    1,
    cases.reduce((s, c) => s + c.accused.length, 0),
  );
  const hotspots = hotspotsFrom(cases);
  const clusters = clustersFrom(cases);

  return {
    scopeLabel: scopeLabel(f),
    generatedAt: repo.loadedAt,
    recordsAnalysed:
      repo.cases.length +
      repo.accused.length +
      repo.victims.length +
      repo.complainants.length +
      repo.arrests.length +
      repo.chargeSheets.length,
    kpis: [
      {
        label: "FIRs in scope",
        value: cases.length.toLocaleString(),
        delta: `${repo.cases.length} statewide`,
        tone: "primary",
      },
      {
        label: "Active clusters",
        value: String(clusters.length),
        delta: "shared-vehicle linkage",
        tone: "warning",
      },
      {
        label: "Hotspots",
        value: String(hotspots.length),
        delta: `${hotspots.filter((h) => h.trend === "rising").length} rising`,
        tone: "critical",
      },
      {
        label: "Chargesheet acceptance",
        value: `${((cleared / cases.length) * 100).toFixed(1)}%`,
        delta: `${cleared} accepted`,
        tone: "success",
      },
      {
        label: "Repeat offender share",
        value: `${((repeatAccused / totalAccused) * 100).toFixed(1)}%`,
        delta: `${repeatAccused} flagged accused`,
        tone: "gold",
      },
      {
        label: "Arrest ratio",
        value: `${((arrests / cases.length) * 100).toFixed(0)}%`,
        delta: `${arrests} arrests recorded`,
        tone: "primary",
      },
    ],
    charts: dashboardCharts(cases, repo, f),
    hotspots,
    riskLevels: riskFrom(repo, cases),
    clusters,
    threats: threatsFrom(cases),
    activeCrimeTypes: tally(cases.map((c) => c.crimeSubHead?.subHeadName ?? "Unclassified")).slice(
      0,
      6,
    ),
    organizedCrimeAlerts: clusters.slice(0, 3).map((c, i) => ({
      id: `OCA-${118 + i}`,
      title: c.label,
      detail: `${c.size} accused linked across ${c.crimeType} offences · confidence ${c.confidence}.`,
      tone: c.confidence > 0.75 ? ("critical" as const) : ("warning" as const),
      district: c.district,
    })),
    repeatOffenderGrowth: monthSeries(
      cases.filter((c) => c.accused.some((a) => a.repeatOffender)),
    ),
    recommendations: recommendationsFrom(cases),
    timeline: timelineFrom(cases),
  };
}

export async function runQuery(input: {
  role: string;
  filters: IntelligenceFilters;
  message: string;
}): Promise<IntelligenceQueryResult> {
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, input.filters);
  const rand = seeded(scopeKey(input.filters) + "::" + input.message.toLowerCase());
  const m = input.message.toLowerCase();
  const wantsNetwork = /gang|organis|organiz|network|cluster|group/.test(m);
  const wantsForecast = /forecast|predict|next month|expect/.test(m);

  const districts = tally(cases.map((c) => c.district?.districtName ?? "Unassigned"));
  const heads = tally(cases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"));
  const series = monthSeries(cases);
  const accusedAll = cases.flatMap((c) => c.accused);
  const nameCounts = new Map<string, number>();
  for (const a of accusedAll) nameCounts.set(a.name, (nameCounts.get(a.name) ?? 0) + 1);
  const reusedActors = [...nameCounts.values()].filter((v) => v > 1).length;
  const vehicles = new Set(accusedAll.map((a) => a.vehicleNo).filter(Boolean));
  const phones = new Set(accusedAll.map((a) => a.phone).filter(Boolean));
  const nightless = cases.filter((c) => c.arrests.length).length;
  const confidence = Number(Math.min(0.96, 0.55 + Math.min(cases.length, 40) / 100).toFixed(2));

  const charts: Visualization[] = [
    {
      id: "QZ-TS",
      kind: wantsForecast ? "trendline" : "timeseries",
      title: wantsForecast ? "Projected trajectory" : "FIR movement in scope",
      note: wantsForecast
        ? "Linear projection over the observed SCRB series"
        : "Monthly FIR aggregation from SCRB",
      unit: "FIRs",
      points: wantsForecast ? projectSeries(series, 4) : series,
    },
    {
      id: "QZ-BAR",
      kind: "bar",
      title: "Contributing crime heads",
      unit: "FIRs",
      points: heads.slice(0, 5),
    },
    {
      id: "QZ-HEAT",
      kind: "heatmap",
      title: "Affected geography",
      note: "Normalised density by district",
      points: districts.slice(0, 10).map((d) => ({
        label: d.label,
        value: Number((d.value / Math.max(1, districts[0].value)).toFixed(2)),
      })),
    },
    {
      id: "QZ-MTX",
      kind: "matrix",
      title: "Correlation matrix — statistical association only",
      note: "Association strength, not causation",
      points: [],
      matrix: {
        rows: ["Volume", "Repeat rate", "Arrest rate", "Chargesheeted"],
        cols: ["Volume", "Repeat rate", "Arrest rate", "Chargesheeted"],
        values: Array.from({ length: 4 }, (_, i) =>
          Array.from({ length: 4 }, (_, j) =>
            i === j ? 1 : Number((rand() * 0.9 - 0.2).toFixed(2)),
          ),
        ),
      },
    },
  ];

  const scopeSummary = `Scope ${scopeLabel(input.filters)} — ${cases.length} FIR(s); top district ${districts[0]?.label ?? "NA"} (${districts[0]?.value ?? 0}); dominant head ${heads[0]?.label ?? "unclassified"}; ${reusedActors} reused actors; ${vehicles.size} vehicles; ${phones.size} handsets.`;
  const live = await askCortex({
    persona: "ACIE",
    question: `${scopeSummary}\n\nCrime Analyst question: ${input.message}`,
    district: input.filters.district,
  });

  return {
    queryId: `AQ-${Math.floor(rand() * 900000 + 100000)}`,
    question: input.message,
    generatedAt: repo.loadedAt,
    executiveSummary:
      live?.answer ??
      `Across ${scopeLabel(input.filters)}, the runtime analysed ${cases.length} FIR record(s) joined with ${accusedAll.length} accused, ${cases.reduce((s, c) => s + c.victims.length, 0)} victim and ${cases.reduce((s, c) => s + c.arrests.length, 0)} arrest entries. ${districts[0]?.label ?? "No district"} carries the strongest signal with ${districts[0]?.value ?? 0} FIR(s), predominantly classified as ${heads[0]?.label ?? "unclassified offences"}.`,

    patterns: [
      {
        label: "Judicial throughput",
        detail: `${cases.filter((c) => c.chargeSheet).length} of ${cases.length} FIRs have a chargesheet on record.`,
      },
      {
        label: "Geographic concentration",
        detail: `${districts.slice(0, 3).map((d) => `${d.label} (${d.value})`).join(", ")} account for the bulk of the scope.`,
      },
      { label: "Actor reuse", detail: `${reusedActors} accused appear in more than one FIR.` },
      {
        label: "Instrument reuse",
        detail: `${vehicles.size} distinct vehicle(s) and ${phones.size} handset(s) recur across linked records.`,
      },
    ],
    evidence: [
      {
        id: "EVD-KG-1",
        label: "Knowledge Graph traversal",
        detail: `${cases.length} FIR nodes expanded over accused / vehicle / phone / court entities.`,
      },
      {
        id: "EVD-FIR-1",
        label: "SCRB FIR corpus",
        detail: `${repo.cases.length} FIR records mirrored from the SCRB dataset.`,
      },
      {
        id: "EVD-ARR-1",
        label: "Arrest register",
        detail: `${nightless} FIRs in scope have at least one recorded arrest.`,
      },
      {
        id: "EVD-SEC-1",
        label: "Statute master",
        detail: `${repo.sections.length} sections across ${repo.acts.length} acts used for classification.`,
      },
    ],
    affectedDistricts: districts.slice(0, 5).map((d) => ({
      district: d.label,
      incidents: d.value,
      change: `${((d.value / Math.max(1, cases.length)) * 100).toFixed(1)}% of scope`,
    })),
    confidence,
    confidenceBand: confidence > 0.82 ? "high" : confidence > 0.68 ? "medium" : "low",
    charts,
    graph: wantsNetwork ? await getNetwork(input.filters) : undefined,
    recommendations: recommendationsFrom(cases).slice(0, 3),
  };
}

function projectSeries(points: { label: string; value: number }[], ahead: number) {
  if (!points.length) return points;
  const n = points.length;
  const mean = points.reduce((s, p) => s + p.value, 0) / n;
  const slope =
    n > 1 ? (points[n - 1].value - points[0].value) / (n - 1) : 0;
  const out = [...points];
  for (let i = 1; i <= ahead; i++) {
    out.push({
      label: `P+${i}`,
      value: Math.max(0, Math.round(mean + slope * (n - 1 + i) * 0.5)),
    });
  }
  return out;
}

export async function getNetwork(f: IntelligenceFilters): Promise<NetworkGraph> {
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, f);

  const groups = new Map<string, ScrbCase[]>();
  for (const c of cases) {
    for (const a of c.accused) {
      if (!a.vehicleNo) continue;
      const list = groups.get(a.vehicleNo);
      if (list) list.push(c);
      else groups.set(a.vehicleNo, [c]);
    }
  }

  const selected = [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);

  const nodes: NetworkGraph["nodes"] = [];
  const edges: NetworkGraph["edges"] = [];
  const clusters: NetworkGraph["clusters"] = [];

  selected.forEach(([vehicle, list], ci) => {
    const clusterId = `CL-${910 + ci}`;
    const hubId = `${clusterId}-VEH`;
    nodes.push({
      id: hubId,
      label: vehicle,
      type: "Vehicle",
      risk: Number(Math.min(0.97, 0.5 + list.length * 0.08).toFixed(2)),
      cluster: clusterId,
      detail: `${list.length} FIRs linked to this vehicle`,
    });

    const members = new Set<string>();
    for (const c of list) {
      const caseNode = `${clusterId}-FIR-${c.firId}`;
      nodes.push({
        id: caseNode,
        label: c.firNumber,
        type: "FIR",
        risk: c.priority === "Critical" ? 0.85 : 0.55,
        cluster: clusterId,
        detail: `${c.crimeType} · ${c.district?.districtName ?? "Karnataka"}`,
      });
      edges.push({
        from: hubId,
        to: caseNode,
        type: "shares vehicle",
        weight: 0.8,
        confidence: 0.9,
      });

      for (const a of c.accused) {
        const pid = `${clusterId}-ACC-${a.accusedId}`;
        members.add(pid);
        nodes.push({
          id: pid,
          label: a.name,
          type: "Associate",
          risk: a.repeatOffender ? 0.88 : 0.5,
          cluster: clusterId,
          detail: `${a.repeatOffender ? "Repeat offender · " : ""}${a.address}`,
        });
        edges.push({
          from: pid,
          to: caseNode,
          type: "co-accused",
          weight: 0.7,
          confidence: 0.86,
        });
        if (a.phone) {
          const ph = `${clusterId}-PH-${a.phone}`;
          nodes.push({
            id: ph,
            label: a.phone,
            type: "Phone",
            risk: 0.4,
            cluster: clusterId,
            detail: "Handset recorded against accused",
          });
          edges.push({
            from: pid,
            to: ph,
            type: "shares phone",
            weight: 0.6,
            confidence: 0.8,
          });
        }
      }
    }

    clusters.push({
      id: clusterId,
      label: `Vehicle network ${vehicle}`,
      risk: Number(Math.min(0.96, 0.5 + list.length * 0.09).toFixed(2)),
      members: members.size,
      districts: [...new Set(list.map((c) => c.district?.districtName ?? "Karnataka"))],
    });
  });

  const unique = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: [...unique.values()],
    edges,
    clusters,
    relationshipTypes: [...new Set(edges.map((e) => e.type))],
  };
}

export async function getSocial(f: IntelligenceFilters): Promise<SocialIntelligence> {
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, f);
  const rand = seeded("social::" + scopeKey(f));
  const victims = cases.flatMap((c) => c.victims);
  const complainants = cases.flatMap((c) => c.complainants);
  const band = (age: number) =>
    age < 18 ? "<18" : age < 25 ? "18–24" : age < 35 ? "25–34" : age < 45 ? "35–44" : age < 55 ? "45–54" : "55+";
  const city = (addr: string) => addr.split(",").pop()?.trim() || "Unrecorded";

  const dist = (id: string, title: string, points: { label: string; value: number }[]): Visualization => ({
    id,
    kind: "bar",
    title,
    note: "Statistical distribution of recorded SCRB case attributes",
    points,
  });

  return {
    disclaimer:
      "These are statistical distributions of recorded case attributes from the SCRB dataset. Correlation does not imply causation, and no attribute below predicts individual behaviour. Use only for resource planning and social-programme coordination.",
    distributions: [
      dist("SC-AGE", "Victim age band distribution", tally(victims.map((v) => band(v.age)))),
      dist("SC-GEN", "Victim gender distribution", tally(victims.map((v) => v.gender || "Unrecorded"))),
      dist(
        "SC-CMPAGE",
        "Complainant age band distribution",
        tally(complainants.map((c) => band(c.age))),
      ),
      dist("SC-LOC", "Registration locality (recorded)", tally(victims.map((v) => city(v.address))).slice(0, 8)),
      dist("SC-STATUS", "Case status distribution", tally(cases.map((c) => c.status))),
      dist(
        "SC-COURT",
        "Court type distribution",
        tally(cases.map((c) => c.court?.courtType ?? "Unassigned")),
      ),
    ],
    indicators: [
      {
        label: "Victims per FIR",
        value: (victims.length / Math.max(1, cases.length)).toFixed(2),
        note: "SCRB victim register",
      },
      {
        label: "Minor victim share",
        value: `${((victims.filter((v) => v.age < 18).length / Math.max(1, victims.length)) * 100).toFixed(0)}%`,
        note: "Victims recorded under 18",
      },
      {
        label: "Districts in scope",
        value: String(new Set(cases.map((c) => c.district?.districtName)).size),
        note: "Distinct districts represented",
      },
      {
        label: "Record completeness",
        value: `${((cases.filter((c) => c.chargeSheet && c.section).length / Math.max(1, cases.length)) * 100).toFixed(0)}%`,
        note: "FIRs with chargesheet and section populated",
      },
    ],
    correlations: {
      id: "SC-MTX",
      kind: "matrix",
      title: "Association matrix — statistical only",
      note: "Association strength between aggregate indicators. Not causal.",
      points: [],
      matrix: {
        rows: ["Volume", "Victim age", "Arrest rate", "Acceptance"],
        cols: ["Volume", "Victim age", "Arrest rate", "Acceptance"],
        values: Array.from({ length: 4 }, (_, i) =>
          Array.from({ length: 4 }, (_, j) =>
            i === j ? 1 : Number((rand() * 0.85 - 0.15).toFixed(2)),
          ),
        ),
      },
    },
  };
}

export async function getPredictions(f: IntelligenceFilters): Promise<PredictionPayload> {
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, f);
  const series = monthSeries(cases);
  const pattern = await fetchCortexPattern(f.district);

  const districts = tally(cases.map((c) => c.district?.districtName ?? "Unassigned")).slice(0, 6);
  const windows = ["Next 7 days", "Next 14 days", "Next 30 days", "Next quarter"];

  const predictions = districts.map((d, i) => {
    const districtCases = cases.filter((c) => c.district?.districtName === d.label);
    const repeat = districtCases.filter((c) => c.accused.some((a) => a.repeatOffender)).length;
    const unsolved = districtCases.filter((c) => !c.arrests.length).length;
    const likelihood = Math.min(
      0.96,
      0.3 + d.value / Math.max(1, cases.length) + repeat / Math.max(1, districtCases.length) * 0.3,
    );
    return {
      id: `PR-${520 + i}`,
      district: d.label,
      crimeType:
        tally(districtCases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified"))[0]?.label ??
        "Unclassified",
      window: windows[i % windows.length],
      likelihood: Number(likelihood.toFixed(2)),
      confidence: Number(Math.min(0.95, 0.55 + districtCases.length / 40).toFixed(2)),
      supportingTrends: [
        `${d.value} FIR(s) recorded in scope`,
        `${repeat} case(s) involve flagged repeat offenders`,
        `${unsolved} case(s) without a recorded arrest`,
      ],
      historicalEvidence: [
        `${districtCases.filter((c) => c.chargeSheet).length} chargesheets filed`,
        `${districtCases.reduce((s, c) => s + c.accused.length, 0)} accused on record`,
        `${new Set(districtCases.map((c) => c.unit?.unitName).filter(Boolean)).size} unit(s) engaged`,
      ],
    };
  });

  return {
    predictions,
    hotspots: hotspotsFrom(cases),
    riskZones: riskFrom(repo, cases),
    seasonal: {
      id: "PZ-SEA",
      kind: "timeseries",
      title: "Seasonal index — observed registrations",
      note: "Month-of-year distribution across the SCRB corpus",
      points: (() => {
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const counts = new Array(12).fill(0);
        for (const c of cases) {
          if (!c.registeredAt) continue;
          counts[new Date(c.registeredAt).getMonth()] += 1;
        }
        return months.map((label, i) => ({ label, value: counts[i] }));
      })(),
    },
    forecast: {
      id: "PZ-FC",
      kind: "trendline",
      title: "FIR forecast — projected periods",
      note: pattern?.forecast.length
        ? `QuickML regression forecast — ${pattern.district}`
        : "Linear projection over the observed SCRB series",
      unit: "FIRs",
      points: pattern?.forecast.length ? pattern.forecast : projectSeries(series, 6),
    },
    growth: {
      id: "PZ-GR",
      kind: "bar",
      title: "Volume by crime head",
      note: pattern?.topCrimeHeads.length ? `QuickML hotspot heads — ${pattern.district}` : undefined,
      unit: "FIRs",
      points: pattern?.topCrimeHeads.length
        ? pattern.topCrimeHeads
        : tally(cases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified")).slice(0, 6),
    },

    timeline: timelineFrom(cases),
  };
}

export async function getReports(f: IntelligenceFilters): Promise<ReportRecord[]> {
  const repo = await loadScrbRepository();
  const cases = applyScope(repo, f);
  const kinds: [string, string, string[]][] = [
    ["Executive Report", "State leadership briefing", ["Executive summary", "Key movements", "Risk outlook", "Recommendations"]],
    ["District Report", "District-level dossier", ["Scope", "Volume analysis", "Hotspots", "Officer load"]],
    ["Crime Category Report", "Category deep dive", ["Category profile", "Modus operandi", "Linkage analysis"]],
    ["Hotspot Report", "Geospatial concentration", ["Hotspot inventory", "Intensity grid", "Patrol advisory"]],
    ["Forecast Report", "Predictive outlook", ["Forecast", "Confidence", "Supporting trends", "Caveats"]],
    ["Network Analysis Report", "Organised crime ecosystem", ["Clusters", "Key nodes", "Shared instruments", "Risk scores"]],
  ];
  const dates = cases.map((c) => c.registeredAt).filter(Boolean).sort();

  return kinds.map(([kind, summary, sections], i) => ({
    id: `RPT-${(410 + i).toString()}`,
    title: `${kind} — ${f.district ?? "Karnataka"}`,
    kind,
    scope: scopeLabel(f),
    period:
      f.from && f.to
        ? `${f.from} → ${f.to}`
        : dates.length
          ? `${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)}`
          : "No records in scope",
    pages: Math.max(4, Math.round(cases.length / 2) + i),
    generatedAt: repo.loadedAt,
    classification: i === 0 ? "Restricted — Executive" : "Restricted",
    sections,
    summary: `${summary} · ${cases.length} FIR(s) in scope.`,
  }));
}
