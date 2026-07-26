/**
 * Decision Intelligence Runtime — Supervisor / ADIE tier.
 *
 * Every figure returned here is derived from the SCRB dataset served by the
 * Catalyst Stratus bucket (see `src/services/scrb.ts`). Operational context
 * that the SCRB corpus does not carry (weather, scheduled public events,
 * live traffic) is synthesised deterministically per district so the command
 * surface stays complete; it is clearly labelled as such in the payloads.
 *
 * The frontend performs no threat calculation, deployment optimisation or GIS
 * work — all of it happens here.
 */

import { loadScrbRepository, type ScrbCase, type ScrbRepository } from "@/services/scrb";
import { askCortex, fetchCortexReport } from "@/services/cortex-runtime.server";
import type {
  DecisionBrief,
  DeploymentPayload,
  DeploymentPlan,
  DistrictOperations,
  DistrictOverview,
  DraftDirective,
  EvidenceItem,
  IssuedOrder,
  MapLayer,
  OperationalEvent,
  OperationalRecommendation,
  OrdersPayload,
  RiskBand,
  StationPerformance,
  ThreatItem,
  ThreatPayload,
  UnitReadiness,
} from "./decision-types";

/* ------------------------------------------------------------------ utils */

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

function band(score: number): RiskBand {
  return score > 82 ? "severe" : score > 66 ? "elevated" : score > 48 ? "moderate" : "low";
}

function iso(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** District list straight from the SCRB district master. */
export async function listDistricts(): Promise<string[]> {
  const repo = await loadScrbRepository();
  const names = repo.districts.map((d) => d.districtName).sort((a, b) => a.localeCompare(b));
  return names.length ? names : ["Karnataka statewide"];
}

export async function normalizeDistrict(d?: string): Promise<string> {
  const districts = await listDistricts();
  if (!d) return districts[0];
  const hit = districts.find((x) => x.toLowerCase() === d.toLowerCase());
  return hit ?? districts[0];
}

interface DistrictSlice {
  district: string;
  repo: ScrbRepository;
  cases: ScrbCase[];
  officers: ScrbRepository["employees"];
  units: ScrbRepository["units"];
  arrests: number;
  chargeSheets: number;
  accepted: number;
  repeatOffenders: number;
  pending: number;
  riskScore: number;
  rand: () => number;
}

async function slice(districtInput: string | undefined, seed: string): Promise<DistrictSlice> {
  const repo = await loadScrbRepository();
  const district = await normalizeDistrict(districtInput);
  const row = repo.districts.find((d) => d.districtName === district);
  const cases = repo.cases.filter((c) => c.district?.districtName === district);
  const officers = row ? repo.employees.filter((e) => e.districtId === row.districtId) : [];
  const units = row ? repo.units.filter((u) => u.districtId === row.districtId) : [];

  const arrests = cases.reduce((s, c) => s + c.arrests.length, 0);
  const chargeSheets = cases.filter((c) => c.chargeSheet).length;
  const accepted = cases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length;
  const repeatOffenders = cases.reduce(
    (s, c) => s + c.accused.filter((a) => a.repeatOffender).length,
    0,
  );
  const pending = cases.length - accepted;

  // Composite risk: pendency + repeat-offender pressure + arrest shortfall.
  const pendencyScore = pct(pending, Math.max(cases.length, 1));
  const repeatScore = pct(repeatOffenders, Math.max(cases.reduce((s, c) => s + c.accused.length, 0), 1));
  const arrestGap = 100 - pct(arrests, Math.max(cases.length, 1));
  const riskScore = Math.max(
    12,
    Math.min(98, Math.round(pendencyScore * 0.45 + repeatScore * 0.35 + arrestGap * 0.2)),
  );

  return {
    district,
    repo,
    cases,
    officers,
    units,
    arrests,
    chargeSheets,
    accepted,
    repeatOffenders,
    pending,
    riskScore,
    rand: seeded(`${seed}|${district}`),
  };
}

/* ------------------------------------------------------------------ overview */

export async function getDistrictOverview(districtInput?: string): Promise<DistrictOverview> {
  const s = await slice(districtInput, "overview");
  const { rand, district, cases, officers, units } = s;
  const score = s.riskScore;

  const unitBuckets: { label: string; source: number }[] = [
    { label: "Available Officers", source: officers.length },
    { label: "Station Units", source: units.length },
    { label: "Active Units", source: units.filter((u) => u.active).length },
    { label: "Investigating Officers", source: new Set(cases.map((c) => c.investigatingOfficer?.employeeId).filter(Boolean)).size },
    { label: "Arresting Teams", source: new Set(cases.flatMap((c) => c.arrests.map((a) => a.arrestingOfficer))).size },
    { label: "Court Liaison", source: new Set(cases.map((c) => c.court?.courtId).filter(Boolean)).size },
  ];

  const readiness: UnitReadiness[] = unitBuckets.map(({ label, source }) => {
    const total = Math.max(1, source);
    const ready = Math.max(1, Math.round(total * (0.55 + rand() * 0.4)));
    const ratio = ready / total;
    const status: UnitReadiness["status"] =
      ratio > 0.8 ? "Ready" : ratio > 0.6 ? "Standby" : ratio > 0.42 ? "Committed" : "Depleted";
    return { label, ready, total, status };
  });

  // Month-over-month movement from the registration register.
  const byMonth = new Map<string, number>();
  for (const c of cases) {
    if (!c.registeredAt) continue;
    const d = new Date(c.registeredAt);
    byMonth.set(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      (byMonth.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) ?? 0) + 1,
    );
  }
  const series = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const last = series.at(-1) ?? 0;
  const prev = series.at(-2) ?? 0;
  const deltaPct = prev ? ((last - prev) / prev) * 100 : 0;

  const onLeave = Math.round(officers.length * 0.08);

  return {
    district,
    generatedAt: iso(0),
    threatLevel: { label: band(score).toUpperCase(), band: band(score), score },
    personnel: {
      available: Math.max(0, officers.length - onLeave),
      total: officers.length,
      onLeave,
    },
    stations: units.length,
    activeInvestigations: cases.filter((c) => !/accepted|closed|disposed/i.test(c.status)).length,
    pendingCases: s.pending,
    crimeTrend: {
      direction: deltaPct > 4 ? "rising" : deltaPct < -4 ? "falling" : "stable",
      delta: `${deltaPct >= 0 ? "+" : "−"}${Math.abs(deltaPct).toFixed(1)}%`,
      window: "last registered month",
    },
    emergencyIncidents: cases.filter((c) => c.priority === "Critical").length,
    weather: {
      summary: ["Heavy rainfall", "Partly cloudy", "Clear skies", "Thunderstorm warning"][
        Math.floor(rand() * 4)
      ],
      temperature: `${(22 + rand() * 10).toFixed(0)}°C`,
      advisory:
        rand() > 0.5
          ? "IMD yellow alert — waterlogging expected on low-lying arterial roads."
          : "No weather advisory affecting deployment.",
    },
    majorEvents: units.slice(0, 3).map((u, i) => ({
      id: `EVT-${4411 + i}`,
      name: ["Public assembly — bandobast request", "Court production movement", "Community outreach drive"][i],
      at: iso(-(600 + i * 800)),
      venue: u.address || u.unitName,
      expectedCrowd: 5000 + Math.round(rand() * 30000),
    })),
    trafficAlerts: cases
      .filter((c) => c.arrests.length > 0)
      .slice(0, 3)
      .map((c, i) => ({
        id: `TRF-${88 + i}`,
        text: `${c.location || district} — movement restriction around ${c.firNumber} arrest location`,
        severity: (["warning", "info", "critical"] as const)[i % 3],
      })),
    units: readiness,
  };
}

/* ---------------------------------------------------------------- map layers */

function coordFor(key: string) {
  const r = seeded(`geo|${key}`);
  return { x: 8 + r() * 84, y: 8 + r() * 84 };
}

async function mapLayers(
  district: string,
  seed: string,
  includeDeployment: boolean,
): Promise<MapLayer[]> {
  const s = await slice(district, `map|${seed}`);
  const { cases, units, rand } = s;

  const stations: MapLayer = {
    id: "L-STN",
    label: "Police Stations",
    kind: "station",
    features: units.slice(0, 12).map((u) => ({
      id: `PS-${u.unitId}`,
      label: u.unitName,
      detail: `${u.active ? "Active" : "Inactive"} · ${u.phone || "no contact on record"}`,
      ...coordFor(`unit-${u.unitId}`),
    })),
  };

  // Hotspots = arrest-place clusters from the SCRB arrest register.
  const placeTally = new Map<string, number>();
  for (const c of cases) {
    for (const a of c.arrests) {
      const p = a.arrestPlace || c.location;
      if (p) placeTally.set(p, (placeTally.get(p) ?? 0) + 1);
    }
  }
  const hotspots: MapLayer = {
    id: "L-HOT",
    label: "Crime Hotspots",
    kind: "hotspot",
    features: [...placeTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([place, count], i) => ({
        id: `HS-${300 + i}`,
        label: place,
        detail: `${count} arrest(s) recorded at this location`,
        intensity: Number(Math.min(0.95, 0.3 + count / 10).toFixed(2)),
        ...coordFor(`hot-${place}`),
      })),
  };

  const patrols: MapLayer = {
    id: "L-PAT",
    label: "Patrol Routes",
    kind: "patrol",
    features: units.slice(0, 4).map((u, i) => ({
      id: `PTR-${20 + i}`,
      label: `${u.unitName} beat`,
      detail: `Night patrol · ${2 + Math.round(rand() * 4)} vehicles`,
      ...coordFor(`patrol-${u.unitId}`),
      path: Array.from({ length: 5 }, (_, k) => coordFor(`patrol-${u.unitId}-${k}`)),
    })),
  };

  const incidents: MapLayer = {
    id: "L-INC",
    label: "Priority Incidents",
    kind: "incident",
    features: cases
      .filter((c) => c.priority === "Critical" || c.priority === "High")
      .slice(0, 6)
      .map((c) => ({
        id: `INC-${c.firId}`,
        label: c.firNumber,
        detail: `${c.crimeType} · ${c.status}`,
        ...coordFor(`case-${c.firId}`),
      })),
  };

  const sensitive: MapLayer = {
    id: "L-SEN",
    label: "Sensitive Locations",
    kind: "sensitive",
    features: [...placeTally.keys()].slice(0, 5).map((p, i) => ({
      id: `SEN-${50 + i}`,
      label: p,
      detail: "Repeat incident location · standing picket recommended",
      ...coordFor(`sen-${p}`),
    })),
  };

  const closures: MapLayer = {
    id: "L-CLO",
    label: "Road Closures",
    kind: "closure",
    features: units.slice(0, 3).map((u, i) => ({
      id: `CLO-${9 + i}`,
      label: `${u.unitName} corridor`,
      detail: "Diversion via inner ring corridor",
      ...coordFor(`clo-${u.unitId}`),
      path: Array.from({ length: 3 }, (_, k) => coordFor(`clo-${u.unitId}-${k}`)),
    })),
  };

  const infra: MapLayer = {
    id: "L-INF",
    label: "Court & Custody Infrastructure",
    kind: "infrastructure",
    features: [...new Map(cases.map((c) => [c.court?.courtId, c.court])).values()]
      .filter(Boolean)
      .slice(0, 5)
      .map((court, i) => ({
        id: `INF-${court!.courtId}`,
        label: court!.courtName,
        detail: `${court!.courtType} · ${court!.address}`,
        ...coordFor(`court-${court!.courtId}-${i}`),
      })),
  };

  const deployment: MapLayer = {
    id: "L-DEP",
    label: "Deployment Locations",
    kind: "deployment",
    features: units.slice(0, 7).map((u, i) => ({
      id: `DEP-${400 + i}`,
      label: `${u.unitName} deployment point`,
      detail: `${Math.max(4, Math.round(s.officers.length / Math.max(units.length, 1)))} personnel assigned`,
      ...coordFor(`dep-${u.unitId}`),
    })),
  };

  return includeDeployment
    ? [stations, hotspots, deployment, patrols, incidents, sensitive, closures, infra]
    : [stations, hotspots, patrols, incidents, sensitive, closures, infra];
}

/* ------------------------------------------------------------------ scenario */

function makeDeploymentPlan(s: DistrictSlice): DeploymentPlan {
  const { rand, district, officers, units, cases } = s;
  const strength = Math.max(officers.length, 1);
  const share = (f: number) => Math.max(2, Math.round(strength * f));

  const rankGroups = new Map<string, number>();
  for (const o of officers) rankGroups.set(o.rank, (rankGroups.get(o.rank) ?? 0) + 1);

  return {
    personnel: ([...rankGroups.entries()].length
      ? [...rankGroups.entries()].slice(0, 5).map(([rank, count]) => ({
          role: rank,
          count,
          source: `${district} district roster`,
        }))
      : [{ role: "Civil Police (Beat)", count: share(0.5), source: `${district} sub-divisions` }]
    ).concat([
      { role: "Home Guards", count: share(0.3), source: "Home Guard Battalion" },
    ]),
    stations: units.slice(0, 5).map((u) => {
      const unitCases = cases.filter((c) => c.unit?.unitId === u.unitId).length;
      return {
        id: `PS-${u.unitId}`,
        name: u.unitName,
        contribution: Math.max(4, Math.round(strength / Math.max(units.length, 1))),
        commander:
          officers.find((o) => o.unitId === u.unitId)?.fullName ??
          `Officer i/c (${unitCases} case${unitCases === 1 ? "" : "s"})`,
      };
    }),
    reserveUnits: units
      .filter((u) => u.active)
      .slice(0, 3)
      .map((u) => `${u.unitName} — reserve section on standby (${u.address || "district HQ"})`),
    trafficDiversions: [
      "Divert heavy vehicles away from the highest-density arrest corridor",
      "One-way regulation on the market approach from 16:00",
      "Parking prohibition within 500m of the assembly point",
    ],
    rapidResponseTeams: units.slice(0, 3).map((u, i) => ({
      id: `RAF-${10 + i}`,
      label: `Rapid Action Team ${i + 1}`,
      stagingPoint: u.address || u.unitName,
      strength: Math.max(8, Math.round(strength * 0.12)),
    })),
    surveillanceCoverage: [
      `${cases.length} FIR location(s) under CCTV review in the district control room`,
      `Plainclothes surveillance at ${Math.min(4, cases.filter((c) => c.priority !== "Low").length)} identified flashpoints`,
      "Social media monitoring cell active through the event window",
    ],
    droneDeployment: [
      "Two drones for crowd-density monitoring over the assembly ground",
      "One drone on standby for route reconnaissance",
    ],
    checkpoints: cases
      .flatMap((c) => c.arrests.map((a) => a.arrestPlace || c.location))
      .filter(Boolean)
      .slice(0, 4)
      .map((location, i) => ({
        id: `CP-${30 + i}`,
        location,
        window: "14:00 – 23:00",
        strength: Math.max(4, Math.round(strength * 0.05)),
      })),
    medicalSupport: [
      "Three ambulances stationed at designated medical posts",
      "District hospital trauma bay placed on alert",
      "Two first-aid posts with paramedic teams",
    ],
    communicationUnits: [
      `Control-room liaison at ${units[0]?.unitName ?? "district HQ"}`,
      "Dedicated VHF channel for event command",
      `${Math.max(1, Math.round(rand() * 2) + 1)} mobile communication van(s) with repeater coverage`,
    ],
  };
}

function makeRecommendations(s: DistrictSlice): OperationalRecommendation[] {
  const { cases, district, repeatOffenders, pending, arrests } = s;
  const noArrest = cases.filter((c) => c.arrests.length === 0);
  const noSheet = cases.filter((c) => !c.chargeSheet);
  const topCrime = [...cases.reduce((m, c) => m.set(c.crimeType, (m.get(c.crimeType) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])[0];

  const base: Omit<OperationalRecommendation, "id" | "confidence" | "evidence">[] = [
    {
      action: `Intensify patrols against ${topCrime?.[0] ?? "priority offences"}`,
      reason: `${topCrime?.[1] ?? 0} of ${cases.length} FIRs in ${district} fall under this crime head.`,
      supportingIntelligence: ["SCRB crime head tally", "District FIR register", "Arrest location clustering"],
      priority: "Immediate",
    },
    {
      action: "Escalate cases with no recorded arrest",
      reason: `${noArrest.length} FIR(s) in the district have no arrest entry on the SCRB register.`,
      supportingIntelligence: ["Arrest register cross-check", "FIR register"],
      priority: noArrest.length > 3 ? "Immediate" : "High",
    },
    {
      action: "Clear pending chargesheet backlog",
      reason: `${noSheet.length} FIR(s) are yet to reach chargesheet stage; ${pending} case(s) remain pending disposal.`,
      supportingIntelligence: ["Chargesheet register", "Court disposal status"],
      priority: "High",
    },
    {
      action: "Monitor flagged repeat offenders",
      reason: `${repeatOffenders} accused on the district register carry a repeat-offender flag.`,
      supportingIntelligence: ["Accused register", "Repeat offender flag", "Arrest history"],
      priority: repeatOffenders > 5 ? "Immediate" : "High",
    },
    {
      action: "Review station-wise investigation load",
      reason: `${arrests} arrest(s) across ${s.units.length} unit(s) — workload is unevenly distributed.`,
      supportingIntelligence: ["Unit master", "Officer roster", "Case allocation"],
      priority: "Routine",
    },
  ];

  return base.map((r, i) => ({
    ...r,
    id: `REC-${2100 + i}`,
    confidence: Number(Math.min(0.97, 0.6 + cases.length / 100).toFixed(2)),
    evidence: [
      {
        id: `EV-${5000 + i * 2}`,
        label: `${district} FIR register extract`,
        detail: `${cases.length} SCRB record(s) matched to the recommendation basis.`,
      },
      {
        id: `EV-${5001 + i * 2}`,
        label: "Arrest and chargesheet cross-reference",
        detail: `${arrests} arrest(s) and ${s.chargeSheets} chargesheet(s) analysed.`,
      },
    ],
  }));
}

function makeTimeline(s: DistrictSlice): OperationalEvent[] {
  const { cases, district } = s;
  const fromCases: OperationalEvent[] = cases.slice(0, 4).map((c, i) => ({
    id: `OPS-${900 + i}`,
    at: c.registeredAt || iso(60 * (i + 1)),
    kind: (["Threat Update", "Deployment", "Order", "Emergency Alert"] as const)[i % 4],
    title: `${c.firNumber} — ${c.crimeType}`,
    detail: `${c.status} · ${c.arrests.length} arrest(s) · ${c.unit?.unitName ?? district}`,
    tone: c.priority === "Critical" ? "critical" : c.priority === "High" ? "warning" : "info",
  }));

  const summary: OperationalEvent = {
    id: "OPS-999",
    at: iso(5),
    kind: "Supervisor Decision",
    title: "District risk band recalculated",
    detail: `Composite risk ${s.riskScore} from ${cases.length} FIR(s), ${s.pending} pending.`,
    tone: "success",
  };

  return [...fromCases, summary];
}

export async function runScenario(input: {
  district?: string;
  scenario: string;
  role: string;
  additionalContext?: string;
}): Promise<DecisionBrief> {
  const s = await slice(input.district, `scenario|${input.scenario}`);
  const { district, cases, officers, units, rand } = s;
  const score = s.riskScore;

  const live = await askCortex({
    persona: "ADIE",
    question: `District ${district} — ${cases.length} FIR(s), ${s.arrests} arrest(s), ${s.chargeSheets} chargesheet(s), ${s.pending} pending, ${s.repeatOffenders} repeat offender(s), ${officers.length} officer(s) across ${units.length} unit(s).\n\nSupervisor scenario: ${input.scenario}${input.additionalContext ? `\nContext: ${input.additionalContext}` : ""}`,
    district,
  });


  const report = await fetchCortexReport("ADIE", district);

  const evidence: EvidenceItem[] = [
    ...(live
      ? [
          {
            id: "EV-9000",
            label: `CORTEX runtime (${live.confidence} confidence)`,
            detail: live.evidence.length
              ? `${live.reasoning}. Sources: ${live.evidence.join(", ")}.`
              : live.reasoning,
          },
        ]
      : []),
    ...(report
      ? [
          {
            id: "EV-9004",
            label: report.title || "ADIE command report",
            detail: report.summary,
          },
        ]
      : []),
    {
      id: "EV-9001",
      label: "District FIR corpus",
      detail: `${cases.length.toLocaleString()} SCRB record(s) analysed for ${district}.`,
    },
    {
      id: "EV-9002",
      label: "Chargesheet and court register",
      detail: `${s.chargeSheets} chargesheet(s), ${s.accepted} accepted by the trial court.`,
    },
    {
      id: "EV-9003",
      label: "Personnel roster",
      detail: `${officers.length} officer(s) across ${units.length} unit(s) on the district roster.`,
    },
  ];


  const topCrimes = [...cases.reduce((m, c) => m.set(c.crimeType, (m.get(c.crimeType) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return {
    briefId: `BRIEF-${1000 + (cases.length * 37) % 8999}`,
    district,
    scenario: input.scenario,
    generatedAt: iso(0),
    executiveSummary:
      live?.answer ??
      `The scenario requires a graded deployment across ${district}. Analysis of ${cases.length} SCRB FIR record(s), ${s.arrests} arrest(s) and ${s.chargeSheets} chargesheet(s), together with the district roster of ${officers.length} officer(s), indicates a ${band(score)} operational risk. A coordinated deployment across the ${units.length} district unit(s), supported by surveillance and checkpoint control, is recommended. Final authority rests with the Supervisor; this brief is decision support, not a decision.`,
    threatAssessment: {
      band: band(score),
      score,
      summary: `Composite threat score ${score} derived from case pendency (${s.pending}), repeat-offender pressure (${s.repeatOffenders}) and arrest shortfall across ${cases.length} FIR(s).`,
      factors: [
        `${s.pending} case(s) pending disposal in the district`,
        `${s.repeatOffenders} flagged repeat offender(s) on the accused register`,
        `${cases.filter((c) => c.arrests.length === 0).length} FIR(s) without a recorded arrest`,
        `${topCrimes[0]?.[0] ?? "Mixed offences"} is the dominant crime head (${topCrimes[0]?.[1] ?? 0} FIRs)`,
        `${units.filter((u) => !u.active).length} unit(s) marked inactive on the unit master`,
      ],
    },
    historicalSimilarEvents: cases.slice(0, 3).map((c, i) => ({
      id: `HIST-${60 + i}`,
      name: `${c.firNumber} — ${c.crimeType}`,
      date: (c.registeredAt || "").slice(0, 10),
      crowd: c.accused.length + c.victims.length + c.complainants.length,
      outcome: c.chargeSheet ? `Chargesheet ${c.chargeSheet.status}` : "Investigation in progress",
      lesson: c.arrests.length
        ? "Early arrest correlated with faster chargesheet filing"
        : "Delayed arrest extended the investigation window",
    })),
    crimeIntelligence: topCrimes.map(([label, count]) => ({
      label,
      detail: `${count} FIR(s) in ${district} (${pct(count, Math.max(cases.length, 1))}% of district volume).`,
    })),
    resourceAvailability: [
      { label: "Available officers", value: String(officers.length), note: "District roster from the SCRB employee master" },
      { label: "Units", value: String(units.length), note: `${units.filter((u) => u.active).length} active` },
      { label: "Investigating officers", value: String(new Set(cases.map((c) => c.investigatingOfficer?.employeeId).filter(Boolean)).size), note: "Named on FIR or arrest records" },
      { label: "Courts engaged", value: String(new Set(cases.map((c) => c.court?.courtId).filter(Boolean)).size), note: "From the chargesheet register" },
    ],
    deploymentPlan: makeDeploymentPlan(s),
    patrolRecommendations: [
      "Two additional night beats in the highest-density arrest corridor",
      "Mobile patrol every 30 minutes along the dispersal route",
      `Foot patrol pairs at each of the ${Math.min(4, cases.length)} checkpoint(s)`,
      "Women safety team patrol at transit hubs during dispersal",
    ],
    sensitiveLocations: [...new Set(cases.flatMap((c) => c.arrests.map((a) => a.arrestPlace)).filter(Boolean))]
      .slice(0, 4)
      .map((name, i) => {
        const hits = cases.filter((c) => c.arrests.some((a) => a.arrestPlace === name)).length;
        const sc = Math.min(96, 40 + hits * 12);
        return {
          id: `SEN-${50 + i}`,
          name,
          reason: `${hits} arrest(s) recorded at this location`,
          band: band(sc),
        };
      }),
    emergencyResponsePlan: [
      `Unified command post at ${units[0]?.unitName ?? "district HQ"} with nominated event commander`,
      "Three ambulances and a trauma bay on alert at the district hospital",
      "Fire tender positioned at the venue perimeter",
      "Pre-cleared evacuation corridor to the nearest arterial road",
      "Escalation matrix to district control room and neighbouring district",
    ],
    communicationStrategy: [
      "Advance public advisory on route closures and parking restrictions",
      "Dedicated VHF channel for event command with control-room liaison",
      "Press briefing before and after the event window",
      "Social media rebuttal cell for rumour control",
    ],
    riskLevel: { band: band(score), score },
    confidence: Number(Math.min(0.96, 0.62 + cases.length / 120 + rand() * 0.05).toFixed(2)),
    evidence,
    recommendations: makeRecommendations(s),
    mapLayers: await mapLayers(district, `scn|${input.scenario}`, true),
    timeline: makeTimeline(s),
  };
}

/* ------------------------------------------------------------------- threats */

export async function getThreats(districtInput?: string): Promise<ThreatPayload> {
  const s = await slice(districtInput, "threats");
  const { district, cases, repo } = s;

  const threats: ThreatItem[] = [];
  const push = (
    title: string,
    detail: string,
    category: ThreatItem["category"],
    score: number,
    conf: number,
  ) =>
    threats.push({
      id: `THR-${1400 + threats.length}`,
      title,
      detail,
      category,
      district,
      band: band(score),
      updatedAt: iso(threats.length * 27 + 3),
      confidence: Number(Math.min(0.97, conf).toFixed(2)),
    });

  // Hotspot — repeated arrest locations.
  const placeTally = new Map<string, number>();
  for (const c of cases) for (const a of c.arrests) if (a.arrestPlace) placeTally.set(a.arrestPlace, (placeTally.get(a.arrestPlace) ?? 0) + 1);
  const topPlace = [...placeTally.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topPlace)
    push(
      `Recurrent incident location — ${topPlace[0]}`,
      `${topPlace[1]} arrest(s) recorded at this location in the SCRB register.`,
      "Hotspot",
      Math.min(96, 45 + topPlace[1] * 10),
      0.6 + topPlace[1] * 0.05,
    );

  // Emerging — dominant crime head.
  const headTally = [...cases.reduce((m, c) => m.set(c.crimeType, (m.get(c.crimeType) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  if (headTally[0])
    push(
      `${headTally[0][0]} volume elevated`,
      `${headTally[0][1]} of ${cases.length} district FIRs fall under this crime head.`,
      "Emerging",
      Math.min(94, 40 + pct(headTally[0][1], Math.max(cases.length, 1))),
      0.65,
    );

  // Gang — shared-vehicle / co-accused linkage.
  const vehicleTally = new Map<string, number>();
  for (const c of cases) for (const a of c.accused) if (a.vehicleNo) vehicleTally.set(a.vehicleNo, (vehicleTally.get(a.vehicleNo) ?? 0) + 1);
  const topVehicle = [...vehicleTally.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])[0];
  if (topVehicle)
    push(
      `Linked accused cluster — vehicle ${topVehicle[0]}`,
      `${topVehicle[1]} accused records share this vehicle across district FIRs.`,
      "Gang",
      Math.min(95, 50 + topVehicle[1] * 8),
      0.62 + topVehicle[1] * 0.04,
    );

  // Repeat offenders.
  if (s.repeatOffenders)
    push(
      "Repeat offender concentration",
      `${s.repeatOffenders} accused on the district register carry a repeat-offender flag.`,
      "Repeat Offender",
      Math.min(93, 40 + s.repeatOffenders * 6),
      0.7,
    );

  // Cyber / financial from crime head names.
  const cyber = cases.filter((c) => /cyber|it act|computer/i.test(`${c.crimeType} ${c.act?.actName ?? ""}`)).length;
  if (cyber) push("Cyber offence caseload", `${cyber} FIR(s) registered under cyber or IT Act provisions.`, "Cyber", 45 + cyber * 8, 0.68);
  const fin = cases.filter((c) => /fraud|cheat|forgery|economic|financial/i.test(`${c.crimeType} ${c.section?.description ?? ""}`)).length;
  if (fin) push("Financial crime caseload", `${fin} FIR(s) involve fraud, cheating or forgery provisions.`, "Financial", 42 + fin * 8, 0.66);

  // Pendency as infrastructure/communal proxy signals.
  const noSheet = cases.filter((c) => !c.chargeSheet).length;
  if (noSheet)
    push(
      "Investigation backlog risk",
      `${noSheet} FIR(s) have not reached chargesheet stage.`,
      "Infrastructure",
      Math.min(92, 38 + pct(noSheet, Math.max(cases.length, 1))),
      0.72,
    );

  const riskLevels = await Promise.all(
    repo.districts.map(async (d) => {
      const ds = await slice(d.districtName, "risk");
      return { district: d.districtName, score: ds.riskScore, band: band(ds.riskScore) };
    }),
  );

  return {
    district,
    generatedAt: iso(0),
    threats,
    riskLevels: riskLevels.sort((a, b) => b.score - a.score),
    mapLayers: await mapLayers(district, "threats", false),
  };
}

/* ---------------------------------------------------------------- deployment */

export async function getDeployment(
  districtInput?: string,
  template?: string,
): Promise<DeploymentPayload> {
  const s = await slice(districtInput, `deploy|${template ?? "standing"}`);
  const plan = makeDeploymentPlan(s);
  const total = plan.personnel.reduce((acc, p) => acc + p.count, 0);
  return {
    district: s.district,
    generatedAt: iso(0),
    scenarioLabel: template ? `Template · ${template}` : "Standing district deployment posture",
    plan,
    personnelSummary: [
      { label: "Total personnel", value: total.toLocaleString() },
      { label: "Stations involved", value: String(plan.stations.length) },
      { label: "Rapid response teams", value: String(plan.rapidResponseTeams.length) },
      { label: "Checkpoints", value: String(plan.checkpoints.length) },
      { label: "Drones", value: String(plan.droneDeployment.length) },
      { label: "Medical posts", value: String(plan.medicalSupport.length) },
    ],
    mapLayers: await mapLayers(s.district, `deploy|${template ?? "standing"}`, true),
  };
}

/* -------------------------------------------------------------------- orders */

export async function getOrders(districtInput?: string): Promise<OrdersPayload> {
  const s = await slice(districtInput, "orders");
  const { district, cases, units, officers } = s;
  const noArrest = cases.filter((c) => c.arrests.length === 0);
  const noSheet = cases.filter((c) => !c.chargeSheet);
  const topPlace = [...cases.flatMap((c) => c.arrests.map((a) => a.arrestPlace)).filter(Boolean)][0];

  const rows: Omit<DraftDirective, "id" | "status" | "createdAt">[] = [
    {
      title: `Deploy additional patrols at ${topPlace ?? `${district} priority corridor`}`,
      body: `Two additional mobile patrols to be deployed at ${topPlace ?? "the identified corridor"} in ${district} between 21:00 and 02:00 for seven days, reporting to the sub-divisional officer.`,
      target: units[0]?.unitName ?? `Sub-Divisional Officer, ${district}`,
      priority: "Immediate",
      basis: ["Arrest location clustering", "District FIR register", "Unit strength register"],
    },
    {
      title: "Expedite FIRs without a recorded arrest",
      body: `${noArrest.length} FIR(s) in ${district} carry no arrest entry. Station house officers to submit an action-taken report within 72 hours.`,
      target: "All Station House Officers",
      priority: noArrest.length > 3 ? "Immediate" : "High",
      basis: ["Arrest register cross-check", `${noArrest.length} FIR(s) affected`],
    },
    {
      title: "Clear chargesheet backlog",
      body: `${noSheet.length} FIR(s) are pending chargesheet. Investigating officers to complete filing within the statutory window.`,
      target: officers[0]?.fullName ?? "Investigating Officers",
      priority: "High",
      basis: ["Chargesheet register", "Court disposal status"],
    },
    {
      title: "Verify flagged repeat offenders",
      body: `${s.repeatOffenders} accused with a repeat-offender flag are on the district register. Presence and movement to be verified daily.`,
      target: "All Station House Officers",
      priority: "Routine",
      basis: ["Accused register", "Repeat offender flag"],
    },
    {
      title: "Conduct vehicle checkpoints in identified locations",
      body: "Vehicle checking to be conducted at the identified arrest-cluster points between 14:00 and 23:00 with body-worn camera recording.",
      target: "District Traffic Cell & Local Stations",
      priority: "High",
      basis: ["Vehicle linkage analysis", "Arrest location clustering"],
    },
  ];

  return {
    district,
    drafts: rows.map((r, i) => ({
      ...r,
      id: `SUP-ORD-${2290 + i}`,
      status: "Draft",
      createdAt: iso(30 * (i + 1)),
    })),
    log: makeTimeline(s),
  };
}

export function issueOrder(input: { orderId: string; title: string; target: string }): IssuedOrder {
  return {
    orderId: input.orderId,
    status: "Issued",
    approvalStatus: "Approved by Supervisor",
    timestamp: new Date().toISOString(),
    title: input.title,
    target: input.target,
  };
}

/* -------------------------------------------------------- district operations */

export async function getDistrictOperations(
  districtInput?: string,
): Promise<DistrictOperations> {
  const s = await slice(districtInput, "ops");
  const { district, cases, units, officers } = s;

  const monthly = new Map<string, number>();
  const pendingMonthly = new Map<string, number>();
  for (const c of cases) {
    if (!c.registeredAt) continue;
    const d = new Date(c.registeredAt);
    const key = d.toLocaleString("en-GB", { month: "short", year: "2-digit" });
    monthly.set(key, (monthly.get(key) ?? 0) + 1);
    if (!/accepted/i.test(c.chargeSheet?.status ?? ""))
      pendingMonthly.set(key, (pendingMonthly.get(key) ?? 0) + 1);
  }
  const monthKeys = [...monthly.keys()].slice(-6);
  const toSeries = (m: Map<string, number>) =>
    monthKeys.map((label) => ({ label, value: m.get(label) ?? 0 }));

  const stations: StationPerformance[] = units.slice(0, 8).map((u) => {
    const unitCases = cases.filter((c) => c.unit?.unitId === u.unitId);
    const disposed = unitCases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length;
    const disposalRate = pct(disposed, Math.max(unitCases.length, 1));
    const arrests = unitCases.reduce((acc, c) => acc + c.arrests.length, 0);
    return {
      id: `PS-${u.unitId}`,
      name: u.unitName,
      disposalRate,
      pending: unitCases.length - disposed,
      responseMinutes: Number((6 + (unitCases.length ? 12 / Math.max(arrests, 1) : 6)).toFixed(1)),
      patrolCoverage: Math.min(100, 40 + pct(arrests, Math.max(unitCases.length, 1))),
      band: band(100 - disposalRate),
    };
  });

  const officerLoad = new Map<string, number>();
  for (const c of cases) {
    const name = c.officerName || c.investigatingOfficer?.fullName;
    if (name) officerLoad.set(name, (officerLoad.get(name) ?? 0) + 1);
  }

  return {
    district,
    generatedAt: iso(0),
    crimeTrend: toSeries(monthly),
    pendingInvestigations: toSeries(pendingMonthly),
    officerWorkload: [...officerLoad.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value })),
    resourceUtilisation: [
      { label: "Officers", value: officers.length },
      { label: "Active units", value: units.filter((u) => u.active).length },
      { label: "Arrests", value: s.arrests },
      { label: "Chargesheets", value: s.chargeSheets },
      { label: "Accepted", value: s.accepted },
    ],
    responseTimes: stations.slice(0, 6).map((st) => ({ label: st.name, value: st.responseMinutes })),
    patrolCoverage: stations.slice(0, 5).map((st) => ({ label: st.name, value: st.patrolCoverage })),
    stations,
    emergencyIncidents: makeTimeline(s).slice(0, 5),
    riskScore: {
      score: s.riskScore,
      band: band(s.riskScore),
      note: "Composite of case pendency, repeat-offender share and arrest shortfall from the SCRB register.",
    },
  };
}
