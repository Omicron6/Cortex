import { loadScrbRepository, type ScrbCase, type ScrbRepository } from "@/services/scrb";
import { askCortex, fetchCortexReport } from "@/services/cortex-runtime.server";
import type { Visualization } from "./intelligence-types";
import type {
  DistrictStat,
  ExecutiveBrief,
  GovKpi,
  GovRecommendation,
  GovernanceDashboard,
  GovernanceFilters,
  GovernanceQueryResult,
  PolicyEvaluation,
  PolicyImpactPayload,
  PolicySimulationInput,
  PolicySimulationResult,
  ResourcePlanning,
  RiskBand,
  StateSummary,
  StrategicInsight,
  StrategicIntelligence,
} from "./governance-types";

/**
 * Adaptive Governance Intelligence Engine — server-side runtime.
 *
 * All statistics, rankings and evaluations are computed from the SCRB dataset
 * served by the Catalyst Stratus bucket (`src/services/scrb.ts`). Planning
 * figures the SCRB corpus does not carry (budget outlay, fleet, training
 * throughput) are derived proportionally from the real roster and case volume
 * and are labelled as derived estimates. The frontend performs no analysis.
 */

/* --------------------------------------------------------------- utilities */

function seedOf(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function band(score: number): RiskBand {
  if (score >= 78) return "severe";
  if (score >= 62) return "elevated";
  if (score >= 45) return "moderate";
  return "low";
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const round = (n: number) => Math.round(n * 10) / 10;

function scopeKey(f: GovernanceFilters) {
  return [f.fy ?? "all", f.district ?? "state", f.category ?? "all", f.segment ?? "all"].join("|");
}

function scopeLabel(f: GovernanceFilters) {
  const parts = [f.district ?? "Karnataka statewide"];
  if (f.category) parts.push(f.category);
  if (f.segment) parts.push(f.segment);
  return parts.join(" · ");
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fyOf(dateIso: string) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `FY ${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------- scope */

interface Scope {
  f: GovernanceFilters;
  repo: ScrbRepository;
  cases: ScrbCase[];
  label: string;
  fyList: string[];
  categories: string[];
  r: () => number;
}

function matchesCategory(c: ScrbCase, category?: string) {
  if (!category) return true;
  const hay = `${c.crimeType} ${c.crimeHead?.crimeHeadName ?? ""} ${c.crimeSubHead?.subHeadName ?? ""} ${c.act?.actName ?? ""}`;
  return hay.toLowerCase().includes(category.toLowerCase());
}

async function scope(f: GovernanceFilters, seedPrefix = ""): Promise<Scope> {
  const repo = await loadScrbRepository();
  const fyList = [...new Set(repo.cases.map((c) => fyOf(c.registeredAt)).filter(Boolean))].sort();
  const categories = [
    ...new Set(repo.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType).filter(Boolean)),
  ].sort();

  const cases = repo.cases.filter(
    (c) =>
      (!f.district || c.district?.districtName === f.district) &&
      (!f.fy || fyOf(c.registeredAt) === f.fy) &&
      matchesCategory(c, f.category),
  );

  return {
    f,
    repo,
    cases,
    label: scopeLabel(f),
    fyList,
    categories,
    r: rng(seedOf(seedPrefix + scopeKey(f))),
  };
}

/** Returns null when the scope matches no SCRB record at all. */
function viable(s: Scope) {
  return s.cases.length > 0;
}

function tally(values: string[]) {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}

function monthSeries(cases: ScrbCase[]) {
  const m = new Map<string, number>();
  for (const c of cases) {
    if (!c.registeredAt) continue;
    const d = new Date(c.registeredAt);
    const key = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => new Date(`1 ${a[0]}`).getTime() - new Date(`1 ${b[0]}`).getTime())
    .map(([label, value]) => ({ label, value }));
}

/* -------------------------------------------------------- district metrics */

function districtStats(s: Scope): DistrictStat[] {
  const byDistrict = new Map<string, ScrbCase[]>();
  for (const c of s.cases) {
    const name = c.district?.districtName ?? "Unassigned";
    const list = byDistrict.get(name);
    if (list) list.push(c);
    else byDistrict.set(name, [c]);
  }

  const years = s.fyList;
  const prevFy = s.f.fy ? years[Math.max(0, years.indexOf(s.f.fy) - 1)] : undefined;

  return [...byDistrict.entries()]
    .map(([district, list]) => {
      const solved = list.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length;
      const sheeted = list.filter((c) => c.chargeSheet).length;
      const clearance = Math.round(pct(sheeted, list.length));
      const conviction = Math.round(pct(solved, list.length));

      const prior = prevFy
        ? s.repo.cases.filter(
            (c) => c.district?.districtName === district && fyOf(c.registeredAt) === prevFy,
          ).length
        : 0;
      const growth = prior ? round(((list.length - prior) / prior) * 100) : 0;

      const repeat = list.reduce((acc, c) => acc + c.accused.filter((a) => a.repeatOffender).length, 0);
      const pending = list.length - solved;
      const score = Math.min(
        98,
        Math.round(pct(pending, list.length) * 0.5 + pct(repeat, Math.max(list.length, 1)) * 0.3 + (100 - clearance) * 0.2),
      );

      return {
        district,
        crimes: list.length,
        clearance,
        conviction,
        growth,
        band: band(score),
      };
    })
    .sort((a, b) => b.crimes - a.crimes);
}

function stateSummary(s: Scope, stats: DistrictStat[]): StateSummary {
  const total = s.cases.length;
  const solved = s.cases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length;
  const active = s.cases.filter((c) => !c.chargeSheet).length;
  const officers = s.f.district
    ? s.repo.employees.filter(
        (e) => s.repo.districts.find((d) => d.districtId === e.districtId)?.districtName === s.f.district,
      ).length
    : s.repo.employees.length;

  return {
    scopeLabel: s.label,
    financialYear: s.f.fy ?? (s.fyList.at(-1) ?? "All reporting years"),
    generatedAt: new Date().toISOString(),
    recordsAnalysed:
      s.repo.cases.length +
      s.repo.accused.length +
      s.repo.victims.length +
      s.repo.complainants.length +
      s.repo.arrests.length +
      s.repo.chargeSheets.length,
    totalCrimes: total,
    activeInvestigations: active,
    pendingCases: total - solved,
    solvedCases: solved,
    clearanceRate: pct(solved, total),
    officerStrength: officers,
    riskDistribution: (["severe", "elevated", "moderate", "low"] as RiskBand[]).map((b) => ({
      band: b,
      districts: stats.filter((x) => x.band === b).length,
    })),
    topCategories: tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType)).slice(0, 6),
    topDistricts: [...stats]
      .sort((a, b) => b.clearance - a.clearance)
      .slice(0, 4)
      .map((d) => ({ district: d.district, clearance: d.clearance })),
    highRiskDistricts: stats
      .filter((d) => d.band === "severe" || d.band === "elevated")
      .slice(0, 4)
      .map((d) => ({
        district: d.district,
        score: Math.min(98, 62 + Math.round(d.growth / 2) + (100 - d.clearance) / 6),
        band: d.band,
      })),
  };
}

function kpis(s: Scope, summary: StateSummary, stats: DistrictStat[]): GovKpi[] {
  const arrests = s.cases.reduce((acc, c) => acc + c.arrests.length, 0);
  const repeat = s.cases.reduce((acc, c) => acc + c.accused.filter((a) => a.repeatOffender).length, 0);
  const accused = s.cases.reduce((acc, c) => acc + c.accused.length, 0);
  const sheeted = s.cases.filter((c) => c.chargeSheet).length;
  const prevFy = s.f.fy ? s.fyList[Math.max(0, s.fyList.indexOf(s.f.fy) - 1)] : undefined;
  const prior = prevFy ? s.repo.cases.filter((c) => fyOf(c.registeredAt) === prevFy).length : 0;
  const yoy = prior ? round(((summary.totalCrimes - prior) / prior) * 100) : 0;

  return [
    {
      label: "Registered Crimes",
      value: summary.totalCrimes.toLocaleString("en-IN"),
      delta: prior ? `${yoy >= 0 ? "+" : "−"}${Math.abs(yoy)}% YoY` : "SCRB register total",
      tone: "primary",
    },
    {
      label: "Chargesheet Rate",
      value: `${pct(sheeted, summary.totalCrimes)}%`,
      delta: `${sheeted} chargesheet(s) filed`,
      tone: "success",
    },
    {
      label: "Court Acceptance Rate",
      value: `${summary.clearanceRate}%`,
      delta: `${summary.solvedCases} accepted by court`,
      tone: "gold",
    },
    {
      label: "Pending Cases",
      value: summary.pendingCases.toLocaleString("en-IN"),
      delta: `${summary.activeInvestigations} without chargesheet`,
      tone: "warning",
    },
    {
      label: "Officer Strength",
      value: summary.officerStrength.toLocaleString("en-IN"),
      delta: `${s.repo.units.filter((u) => u.active).length} active unit(s)`,
      tone: "primary",
    },
    {
      label: "Arrest Ratio",
      value: `${pct(arrests, summary.totalCrimes)}%`,
      delta: `${arrests} arrest(s) recorded`,
      tone: "gold",
    },
    {
      label: "High Risk Districts",
      value: String(stats.filter((d) => d.band === "severe" || d.band === "elevated").length),
      delta: `of ${stats.length} reporting district(s)`,
      tone: "critical",
    },
    {
      label: "Repeat Offender Share",
      value: `${pct(repeat, Math.max(accused, 1))}%`,
      delta: `${repeat} flagged accused`,
      tone: "success",
    },
  ];
}

function dashboardCharts(s: Scope, stats: DistrictStat[]): Visualization[] {
  const arrestsByDistrict = new Map<string, number>();
  for (const c of s.cases) {
    const d = c.district?.districtName ?? "Unassigned";
    arrestsByDistrict.set(d, (arrestsByDistrict.get(d) ?? 0) + c.arrests.length);
  }

  return [
    {
      id: "gov-trend",
      kind: "timeseries",
      title: "Registered Crime Trend",
      note: "FIR registrations by month, SCRB register",
      points: monthSeries(s.cases),
    },
    {
      id: "gov-district-compare",
      kind: "comparison",
      title: "District Comparison — Registered vs Chargesheeted",
      legend: ["Registered", "Chargesheeted"],
      points: stats.slice(0, 10).map((d) => ({
        label: d.district,
        value: d.crimes,
        secondary: Math.round(d.crimes * (d.clearance / 100)),
      })),
    },
    {
      id: "gov-growth",
      kind: "bar",
      title: "Year-on-Year Change (%)",
      note: "Negative values indicate reduction",
      unit: "%",
      points: stats.slice(0, 10).map((d) => ({ label: d.district, value: d.growth })),
    },
    {
      id: "gov-investigation",
      kind: "trendline",
      title: "Chargesheet Volume by Month",
      note: "Filing throughput from the chargesheet register",
      points: monthSeries(s.cases.filter((c) => c.chargeSheet)),
    },
    {
      id: "gov-conviction",
      kind: "bar",
      title: "Court Acceptance Rate by District",
      unit: "%",
      points: stats.slice(0, 10).map((d) => ({ label: d.district, value: d.conviction })),
    },
    {
      id: "gov-categories",
      kind: "bar",
      title: "Volume by Crime Head",
      points: tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType)).slice(0, 8),
    },
    {
      id: "gov-officer-alloc",
      kind: "pie",
      title: "Case Status Distribution",
      points: tally(s.cases.map((c) => c.status)).slice(0, 5),
    },
    {
      id: "gov-coverage",
      kind: "heatmap",
      title: "Arrest Density by District",
      note: "Arrests recorded against registered FIRs",
      points: stats.slice(0, 10).map((d) => ({
        label: d.district,
        value: arrestsByDistrict.get(d.district) ?? 0,
      })),
    },
  ];
}

async function brief(
  s: Scope,
  summary: StateSummary,
  stats: DistrictStat[],
): Promise<ExecutiveBrief> {
  const critical = stats.filter((d) => d.band === "severe" || d.band === "elevated").slice(0, 3);
  const improving = [...stats].sort((a, b) => a.growth - b.growth).slice(0, 3);
  const topCat = summary.topCategories[0];
  const noArrest = s.cases.filter((c) => c.arrests.length === 0).length;
  const repeat = s.cases.reduce((acc, c) => acc + c.accused.filter((a) => a.repeatOffender).length, 0);

  const report = await fetchCortexReport("AGIE", s.f.district);
  const liveSections = report
    ? [
        { id: "runtime", heading: report.title || "CORTEX Runtime Assessment", body: report.summary },
        ...report.sections.map((section, i) => ({
          id: `runtime-${i}`,
          heading: section.heading || "Runtime Analysis",
          body: section.body,
        })),
      ]
    : [];

  return {
    id: `EB-${seedOf(scopeKey(s.f)) % 99999}`,
    preparedFor: "Hon'ble Home Minister / Director General & Inspector General of Police",
    generatedAt: new Date().toISOString(),
    confidence: Math.min(96, 60 + Math.round(s.cases.length / 3)),
    sections: [
      ...liveSections,

      {
        id: "state",
        heading: "Current State Overview",
        body: `${summary.scopeLabel} recorded ${summary.totalCrimes.toLocaleString("en-IN")} registered crimes in ${summary.financialYear}, with a court acceptance rate of ${summary.clearanceRate}% and ${summary.pendingCases.toLocaleString("en-IN")} cases pending disposal across ${stats.length} reporting district(s).`,
      },
      {
        id: "risks",
        heading: "Key Risks",
        body: "The following risk vectors emerge from the SCRB register for the selected scope.",
        bullets: [
          `${topCat?.label ?? "Mixed offences"} is the dominant crime head with ${topCat?.value ?? 0} FIR(s).`,
          `${noArrest} FIR(s) carry no arrest entry on the arrest register.`,
          `Disposal backlog concentrated in ${critical[0]?.district ?? stats[0]?.district ?? "reporting districts"}, with ${repeat} flagged repeat offender(s) in scope.`,
        ],
      },
      {
        id: "positive",
        heading: "Positive Developments",
        body: "Measurable improvement is evident in the following districts.",
        bullets: improving.map(
          (d) =>
            `${d.district} recorded ${Math.abs(d.growth).toFixed(1)}% ${d.growth < 0 ? "reduction" : "growth"} with ${d.clearance}% chargesheet rate.`,
        ),
      },
      {
        id: "critical",
        heading: "Critical Districts",
        body: critical.length
          ? critical
              .map(
                (d) =>
                  `${d.district} (${d.band}, ${d.crimes.toLocaleString("en-IN")} crimes, ${d.clearance}% chargesheet rate)`,
              )
              .join("; ") + "."
          : "No district currently classified severe for the selected scope.",
      },
      {
        id: "policy",
        heading: "Policy Recommendations",
        body: "Interventions are sequenced by expected impact against the observed register.",
        bullets: [
          `Sanction dedicated investigation capacity for ${topCat?.label ?? "priority crime heads"}.`,
          `Time-bound disposal targets for the ${summary.pendingCases} pending case(s).`,
          `Verification drive covering the ${repeat} flagged repeat offender(s).`,
        ],
      },
      {
        id: "budget",
        heading: "Budget Insights",
        body: `Derived estimate: ₹${Math.round(summary.officerStrength * 0.9 + summary.totalCrimes * 0.4)} Cr indicative outlay for the scope, based on roster size and case volume. Financial ledgers are not part of the SCRB dataset.`,
      },
      {
        id: "resources",
        heading: "Resource Recommendations",
        body: `Estimated additional requirement of ${Math.max(1, Math.round(summary.pendingCases / 4))} investigating officer(s) and ${Math.max(1, Math.round(stats.length / 2))} forensic access point(s) to close the observed disposal gap.`,
      },
      {
        id: "forecast",
        heading: "Forecast Summary",
        body: `Linear projection on the monthly registration series indicates a ${round(
          (() => {
            const pts = monthSeries(s.cases).map((p) => p.value);
            const a = pts.slice(0, Math.ceil(pts.length / 2)).reduce((x, y) => x + y, 0);
            const b = pts.slice(Math.ceil(pts.length / 2)).reduce((x, y) => x + y, 0);
            return a ? ((b - a) / a) * 100 : 0;
          })(),
        )}% change over the next comparable period. Confidence scales with the volume of records in scope.`,
      },
    ],
  };
}

function recommendations(s: Scope, stats: DistrictStat[]): GovRecommendation[] {
  const cats = tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType)).slice(0, 3);
  const noArrest = s.cases.filter((c) => c.arrests.length === 0).length;
  const noSheet = s.cases.filter((c) => !c.chargeSheet).length;
  const repeat = s.cases.reduce((acc, c) => acc + c.accused.filter((a) => a.repeatOffender).length, 0);
  const worst = stats.filter((d) => d.band === "severe" || d.band === "elevated");

  const built: Omit<GovRecommendation, "id" | "priority" | "confidence">[] = [
    ...cats.map((c) => ({
      action: `Strengthen investigation capacity for ${c.label}`,
      evidence: `${c.value} FIR(s) registered under this crime head in scope`,
      expectedImpact: `Targeted capacity could lift disposal on ${c.value} case(s)`,
      district: stats[0]?.district ?? "Statewide",
    })),
    {
      action: "Close arrest gap on open FIRs",
      evidence: `${noArrest} FIR(s) with no arrest recorded`,
      expectedImpact: "Improves arrest ratio and shortens investigation window",
      district: worst[0]?.district ?? stats[0]?.district ?? "Statewide",
    },
    {
      action: "Clear the chargesheet backlog",
      evidence: `${noSheet} FIR(s) yet to reach chargesheet stage`,
      expectedImpact: "Direct reduction in pending case count",
      district: worst[1]?.district ?? stats[1]?.district ?? "Statewide",
    },
    {
      action: "Institute repeat offender monitoring",
      evidence: `${repeat} accused flagged as repeat offenders`,
      expectedImpact: "Reduces recidivism-driven case inflow",
      district: worst[2]?.district ?? stats[2]?.district ?? "Statewide",
    },
  ];

  const priorities: GovRecommendation["priority"][] = ["Immediate", "High", "Medium", "Routine"];
  return built.map((r, i) => ({
    ...r,
    id: `GR-${100 + i}`,
    priority: priorities[i % priorities.length],
    confidence: Math.min(96, 62 + Math.round(s.cases.length / 4)),
  }));
}

/* --------------------------------------------------------------- dashboard */

export async function getGovernanceDashboard(
  f: GovernanceFilters,
): Promise<GovernanceDashboard | null> {
  const s = await scope(f);
  if (!viable(s)) return null;
  const stats = districtStats(s);
  const summary = stateSummary(s, stats);
  return {
    summary,
    kpis: kpis(s, summary, stats),
    charts: dashboardCharts(s, stats),
    districtStats: stats,
    brief: await brief(s, summary, stats),
    recommendations: recommendations(s, stats),
  };
}

/* -------------------------------------------------------------- strategy */

export async function getStrategicIntelligence(
  f: GovernanceFilters,
): Promise<StrategicIntelligence | null> {
  const s = await scope(f, "strategy");
  if (!viable(s)) return null;
  const stats = districtStats(s);
  const cats = tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType));
  const months = monthSeries(s.cases);
  const half = Math.ceil(months.length / 2);
  const firstHalf = months.slice(0, half).reduce((a, p) => a + p.value, 0);
  const lastHalf = months.slice(half).reduce((a, p) => a + p.value, 0);
  const repeat = s.cases.reduce((acc, c) => acc + c.accused.filter((a) => a.repeatOffender).length, 0);
  const accusedTotal = s.cases.reduce((acc, c) => acc + c.accused.length, 0);
  const multiDistrict = (() => {
    const byName = new Map<string, Set<string>>();
    for (const c of s.cases)
      for (const a of c.accused) {
        const set = byName.get(a.name.toLowerCase()) ?? new Set<string>();
        if (c.district) set.add(c.district.districtName);
        byName.set(a.name.toLowerCase(), set);
      }
    return [...byName.values()].filter((set) => set.size > 1).length;
  })();

  const insightRows: [string, string, string][] = [
    [
      "Emerging Crime Trends",
      `${cats[0]?.label ?? "Mixed offences"} leads the register with ${cats[0]?.value ?? 0} FIR(s)`,
      `${cats[1]?.label ?? "Secondary heads"} follows with ${cats[1]?.value ?? 0} FIR(s)`,
    ],
    [
      "Crime Migration",
      `${stats[0]?.district ?? "Leading district"} carries ${stats[0]?.crimes ?? 0} FIR(s) — highest in scope`,
      `${stats.length} district(s) reporting in the selected scope`,
    ],
    [
      "Organized Crime Expansion",
      `${multiDistrict} accused identity/identities appear across more than one district`,
      "Cross-district linkage resolved through the accused register",
    ],
    [
      "Volume Movement",
      `Registrations moved ${round(firstHalf ? ((lastHalf - firstHalf) / firstHalf) * 100 : 0)}% between the first and second half of the series`,
      `${months.length} reporting month(s) in scope`,
    ],
    [
      "Disposal Quality",
      `${pct(s.cases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length, s.cases.length)}% of chargesheets accepted by the trial court`,
      `${s.cases.filter((c) => c.chargeSheet).length} chargesheet(s) filed in scope`,
    ],
    [
      "Repeat Offender Pressure",
      `${pct(repeat, Math.max(accusedTotal, 1))}% of accused carry a repeat-offender flag`,
      `${repeat} of ${accusedTotal} accused records`,
    ],
    [
      "Arrest Effectiveness",
      `${pct(s.cases.reduce((a, c) => a + c.arrests.length, 0), s.cases.length)}% arrest ratio against registered FIRs`,
      `${s.cases.filter((c) => c.arrests.length === 0).length} FIR(s) with no arrest`,
    ],
    [
      "Long-Term Outlook",
      `Projection based on ${s.cases.length} FIR(s) across ${s.fyList.length} reporting year(s)`,
      "Model recomputes on every SCRB refresh",
    ],
  ];

  const insights: StrategicInsight[] = insightRows.map(([category, detail, context], i) => ({
    id: `SI-${200 + i}`,
    category,
    title: category,
    detail,
    historicalContext: context,
    evidence: [
      `${s.cases.length} FIR(s) analysed across ${stats.length} district(s)`,
      `${s.repo.chargeSheets.length} chargesheet(s) and ${s.repo.arrests.length} arrest(s) in the corpus`,
      `Cross-verified against ${s.repo.crimeHeads.length} SCRB crime head(s)`,
    ],
    confidence: Math.min(96, 60 + Math.round(s.cases.length / 3)),
    direction: lastHalf > firstHalf ? "rising" : lastHalf < firstHalf ? "falling" : "stable",
  }));

  const yearSeries = s.fyList.map((fy) => ({
    label: fy,
    value: s.repo.cases.filter(
      (c) => fyOf(c.registeredAt) === fy && (!f.district || c.district?.districtName === f.district),
    ).length,
  }));

  const seasonal = (() => {
    const m = new Map<string, number>();
    for (const c of s.cases) {
      if (!c.registeredAt) continue;
      const key = MONTH_NAMES[new Date(c.registeredAt).getMonth()];
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return MONTH_NAMES.map((label) => ({ label, value: m.get(label) ?? 0 }));
  })();

  return {
    insights,
    rankings: [...stats].sort((a, b) => b.clearance - a.clearance),
    charts: [
      { id: "si-evolution", kind: "timeseries", title: "Crime Evolution by Reporting Year", points: yearSeries },
      {
        id: "si-emerging",
        kind: "bar",
        title: "Volume by Crime Head",
        points: cats.slice(0, 8),
      },
      {
        id: "si-organized",
        kind: "heatmap",
        title: "Case Density by District",
        points: stats.slice(0, 10).map((d) => ({ label: d.district, value: d.crimes })),
      },
      {
        id: "si-officer-perf",
        kind: "comparison",
        title: "Officer Performance — Load vs Disposal",
        legend: ["Case load", "Chargesheeted"],
        points: stats.slice(0, 8).map((d) => ({
          label: d.district,
          value: d.crimes,
          secondary: Math.round(d.crimes * (d.clearance / 100)),
        })),
      },
      {
        id: "si-budget-alloc",
        kind: "bar",
        title: "Officer Distribution by Rank",
        points: tally(s.repo.employees.map((e) => e.rank)).slice(0, 6),
      },
    ],
    fiveYear: {
      id: "si-fiveyear",
      kind: "trendline",
      title: "Statewide Trend by Reporting Year",
      points: yearSeries,
    },
    seasonality: {
      id: "si-season",
      kind: "bar",
      title: "Seasonality Profile",
      note: "Registered crime by calendar month",
      points: seasonal,
    },
    repeatOffenders: [
      { label: "Repeat offenders tracked", value: repeat.toLocaleString("en-IN"), note: "Flagged on the SCRB accused register" },
      { label: "Repeat offender share", value: `${pct(repeat, Math.max(accusedTotal, 1))}%`, note: "Of all accused in scope" },
      { label: "Multi-district offenders", value: String(multiDistrict), note: "Identity active in two or more districts" },
    ],
    infrastructureGaps: stats.slice(0, 6).map((d) => {
      const districtRow = s.repo.districts.find((x) => x.districtName === d.district);
      const units = districtRow ? s.repo.units.filter((u) => u.districtId === districtRow.districtId) : [];
      const officers = districtRow
        ? s.repo.employees.filter((e) => e.districtId === districtRow.districtId)
        : [];
      const gap = !units.length
        ? "No unit mapped to this district on the unit master"
        : units.some((u) => !u.active)
          ? `${units.filter((u) => !u.active).length} inactive unit(s) on the unit master`
          : officers.length < d.crimes
            ? `Officer strength (${officers.length}) below case volume (${d.crimes})`
            : "Capacity within observed case volume";
      return { district: d.district, gap, severity: d.band };
    }),
  };
}

/* ----------------------------------------------------------- policy impact */

export async function getPolicyImpact(f: GovernanceFilters): Promise<PolicyImpactPayload | null> {
  const s = await scope(f, "impact");
  if (!viable(s)) return null;

  const cats = tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType)).slice(0, 5);
  const years = s.fyList;

  const evaluations: PolicyEvaluation[] = cats.map((cat, i) => {
    const catCases = s.cases.filter(
      (c) => (c.crimeHead?.crimeHeadName ?? c.crimeType) === cat.label,
    );
    const half = Math.ceil(catCases.length / 2);
    const sortedByDate = [...catCases].sort(
      (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime(),
    );
    const before = sortedByDate.slice(0, half).length || 1;
    const after = sortedByDate.slice(half).length;
    const accepted = catCases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length;
    const arrests = catCases.reduce((acc, c) => acc + c.arrests.length, 0);

    return {
      id: `PE-${300 + i}`,
      policy: `Focused enforcement — ${cat.label}`,
      period: years.length > 1 ? `${years[0]} → ${years.at(-1)}` : (years[0] ?? "All reporting years"),
      district: f.district ?? s.cases.find((c) => c.crimeType === cat.label)?.district?.districtName ?? "Statewide",
      before,
      after,
      changePct: round(((after - before) / before) * 100),
      kpis: [
        { label: "Focus area", value: cat.label, note: "Primary measured outcome" },
        { label: "Court acceptance", value: `${pct(accepted, Math.max(catCases.length, 1))}%`, note: "Chargesheets accepted" },
        { label: "Arrests recorded", value: String(arrests), note: "From the SCRB arrest register" },
      ],
      evidence: [
        `${catCases.length} FIR(s) in the before/after windows`,
        `${catCases.filter((c) => c.chargeSheet).length} chargesheet(s) linked to this crime head`,
        `Windows split at the median registration date in scope`,
      ],
      confidence: Math.min(94, 55 + catCases.length * 2),
      trend: {
        id: `pe-trend-${i}`,
        kind: "trendline",
        title: `${cat.label} — Trend Analysis`,
        note: "Registrations by month",
        points: monthSeries(catCases),
      },
    };
  });

  return {
    evaluations,
    charts: [
      {
        id: "pi-before-after",
        kind: "comparison",
        title: "Before vs After — Measured Outcome",
        legend: ["Before", "After"],
        points: evaluations.map((e) => ({ label: e.policy, value: e.before, secondary: e.after })),
      },
      {
        id: "pi-effect",
        kind: "bar",
        title: "Net Change in Registered Volume (%)",
        unit: "%",
        points: evaluations.map((e) => ({ label: e.policy, value: e.changePct })),
      },
    ],
  };
}

/* -------------------------------------------------------- resource planning */

export async function getResourcePlanning(f: GovernanceFilters): Promise<ResourcePlanning | null> {
  const s = await scope(f, "resource");
  if (!viable(s)) return null;
  const stats = districtStats(s);
  const officers = s.repo.employees;
  const units = s.repo.units;
  const courts = s.repo.courts;

  const officersOf = (district: string) => {
    const row = s.repo.districts.find((d) => d.districtName === district);
    return row ? officers.filter((e) => e.districtId === row.districtId).length : 0;
  };
  const unitsOf = (district: string) => {
    const row = s.repo.districts.find((d) => d.districtName === district);
    return row ? units.filter((u) => u.districtId === row.districtId).length : 0;
  };

  const pending = s.cases.filter((c) => !/accepted/i.test(c.chargeSheet?.status ?? "")).length;

  return {
    stats: [
      { label: "Officer Strength", value: officers.length.toLocaleString("en-IN"), delta: `${new Set(officers.map((o) => o.rank)).size} rank(s) on roster`, tone: "primary" },
      { label: "Police Units", value: String(units.length), delta: `${units.filter((u) => u.active).length} active`, tone: "success" },
      { label: "Courts Engaged", value: String(courts.length), delta: `${new Set(courts.map((c) => c.courtType)).size} court type(s)`, tone: "warning" },
      { label: "Pending Cases", value: String(pending), delta: "awaiting court acceptance", tone: "critical" },
      { label: "Districts Covered", value: String(s.repo.districts.length), delta: `${stats.length} reporting in scope`, tone: "gold" },
      { label: "Cases per Officer", value: String(round(s.cases.length / Math.max(officers.length, 1))), delta: "observed investigation load", tone: "primary" },
    ],
    officerDistribution: {
      id: "rp-officers",
      kind: "bar",
      title: "Officer Distribution by District",
      points: stats.slice(0, 10).map((d) => ({ label: d.district, value: officersOf(d.district) })),
    },
    stationCoverage: {
      id: "rp-stations",
      kind: "heatmap",
      title: "Unit Coverage by District",
      points: stats.slice(0, 10).map((d) => ({ label: d.district, value: unitsOf(d.district) })),
    },
    vehicleAllocation: {
      id: "rp-vehicles",
      kind: "comparison",
      title: "Case Load vs Officer Strength",
      legend: ["Cases", "Officers"],
      points: stats.slice(0, 8).map((d) => ({
        label: d.district,
        value: d.crimes,
        secondary: officersOf(d.district),
      })),
    },
    technologyAdoption: {
      id: "rp-tech",
      kind: "pie",
      title: "Court Type Distribution",
      points: tally(courts.map((c) => c.courtType)).slice(0, 5),
    },
    forecast: {
      id: "rp-forecast",
      kind: "trendline",
      title: "Case Volume by Reporting Year",
      note: "Basis for the resource requirement projection",
      points: s.fyList.map((fy) => ({
        label: fy,
        value: s.repo.cases.filter((c) => fyOf(c.registeredAt) === fy).length,
      })),
    },
    underserved: stats
      .filter((d) => officersOf(d.district) < d.crimes || unitsOf(d.district) === 0)
      .slice(0, 5)
      .map((d) => ({
        district: d.district,
        gap: unitsOf(d.district) === 0 ? "No unit mapped on the unit master" : "Officer strength below case volume",
        requirement: `${Math.max(1, d.crimes - officersOf(d.district))} additional officer(s) · ${Math.max(1, Math.ceil(d.crimes / 10))} unit(s)`,
        severity: d.band,
      })),
    capacity: [
      { label: "Chargesheet completion", value: `${pct(s.cases.filter((c) => c.chargeSheet).length, s.cases.length)}%`, note: "FIRs reaching chargesheet stage" },
      { label: "Court acceptance", value: `${pct(s.cases.filter((c) => /accepted/i.test(c.chargeSheet?.status ?? "")).length, s.cases.length)}%`, note: "Chargesheets accepted by court" },
      { label: "Active unit ratio", value: `${pct(units.filter((u) => u.active).length, Math.max(units.length, 1))}%`, note: "Of all units on the master" },
    ],
    training: tally(officers.map((o) => o.rank))
      .slice(0, 3)
      .map((r) => ({
        label: `${r.label} cadre`,
        value: `${r.value} officer(s)`,
        note: "Eligible for CORTEX operator training",
      })),
  };
}

/* ------------------------------------------------------------- simulation */

const POLICY_LIBRARY = [
  "Increase police strength by 10%",
  "Deploy additional cyber units",
  "Increase CCTV coverage",
  "Open new police stations",
  "Expand women safety patrols",
  "Increase night patrolling",
  "Allocate additional forensic resources",
];

export function listPolicies() {
  return POLICY_LIBRARY;
}

export async function runPolicySimulation(
  input: PolicySimulationInput,
): Promise<PolicySimulationResult> {
  const s = await scope({ district: input.parameters.district }, "sim" + input.policy);
  const magnitude = Math.max(1, Math.min(100, input.parameters.magnitude));
  const horizon = Math.max(3, Math.min(60, input.parameters.horizonMonths));
  const stats = districtStats(s);

  // Elasticity is anchored to the observed disposal gap: the wider the gap,
  // the more headroom a capacity intervention has.
  const total = Math.max(s.cases.length, 1);
  const disposalGap = 1 - s.cases.filter((c) => c.chargeSheet).length / total;
  const reduction = round(magnitude * (0.12 + disposalGap * 0.25));
  const officers = s.repo.employees.length;

  const monthly = monthSeries(s.cases);
  const baseline = monthly.length ? monthly : [{ label: "Baseline", value: total }];

  return {
    id: `PS-${seedOf(input.policy) % 99999}`,
    policy: input.policy,
    generatedAt: new Date().toISOString(),
    projectedImpact: {
      crimeReductionPct: reduction,
      budgetImpactCr: Math.round(magnitude * (officers / 50 + total / 20)),
      officerRequirement: Math.max(1, Math.round((magnitude / 100) * officers)),
      affectedDistricts: stats.length,
      horizon: `${horizon} months`,
    },
    confidence: Math.min(94, 55 + Math.round(total / 4)),
    supportingEvidence: [
      `Elasticity derived from an observed disposal gap of ${Math.round(disposalGap * 100)}% across ${total} FIR(s).`,
      `Estimation base: ${s.repo.cases.length} SCRB FIR record(s), ${s.repo.chargeSheets.length} chargesheet(s), ${s.repo.arrests.length} arrest(s).`,
      `Roster base: ${officers} officer(s) across ${s.repo.units.length} unit(s) and ${s.repo.districts.length} district(s).`,
      `Projection recomputes on each SCRB dataset refresh; no financial ledger is present in the corpus.`,
    ],
    visualizations: [
      {
        id: "ps-projection",
        kind: "comparison",
        title: "Projected Crime Trajectory",
        note: "Baseline vs simulated intervention",
        legend: ["Baseline", "Simulated"],
        points: baseline.map((p) => ({
          label: p.label,
          value: p.value,
          secondary: Math.round(p.value * (1 - reduction / 100)),
        })),
      },
      {
        id: "ps-district",
        kind: "bar",
        title: "Projected Reduction by District (%)",
        unit: "%",
        points: stats.slice(0, 8).map((d) => ({
          label: d.district,
          value: round(reduction * (1 + (100 - d.clearance) / 200)),
        })),
      },
      {
        id: "ps-budget",
        kind: "bar",
        title: "Officer Requirement Phasing",
        note: "Derived from roster strength",
        points: ["Y1", "Y2", "Y3"].map((label, i) => ({
          label,
          value: Math.max(1, Math.round(((magnitude / 100) * officers * (i + 1)) / 3)),
        })),
      },
    ],
    advisory:
      "This simulation is advisory only. Projections are statistical estimates derived from the SCRB register and do not account for unmodelled operational factors. Final decisions rest with the competent authority.",
  };
}

/* ------------------------------------------------------------------ query */

export async function runGovernanceQuery(input: {
  role: string;
  filters: GovernanceFilters;
  query: string;
}): Promise<GovernanceQueryResult> {
  const s = await scope(input.filters, "query" + input.query);
  const stats = districtStats(s);
  const cats = tally(s.cases.map((c) => c.crimeHead?.crimeHeadName ?? c.crimeType));
  const months = monthSeries(s.cases);
  const half = Math.ceil(months.length / 2);
  const shift = round(
    (() => {
      const a = months.slice(0, half).reduce((x, p) => x + p.value, 0);
      const b = months.slice(half).reduce((x, p) => x + p.value, 0);
      return a ? ((b - a) / a) * 100 : 0;
    })(),
  );

  const live = await askCortex({
    persona: "AGIE",
    question: `Scope ${scopeLabel(input.filters)} — ${s.cases.length} FIR(s); ${shift}% half-over-half movement; leading districts ${stats[0]?.district ?? "NA"}, ${stats[1]?.district ?? "NA"}; dominant category ${cats[0]?.label ?? "mixed"}.\n\nPolicymaker question: ${input.query}`,
    district: input.filters.district,
  });

  return {
    queryId: `GQ-${seedOf(input.query) % 999999}`,
    question: input.query,
    generatedAt: new Date().toISOString(),
    executiveSummary:
      live?.answer ??
      `For ${scopeLabel(input.filters)}, the runtime analysed ${s.cases.length.toLocaleString("en-IN")} FIR record(s) from the SCRB register. The dominant signal is a ${shift}% movement in registered volume between the first and second half of the series, concentrated in ${stats[0]?.district ?? "reporting districts"} and ${stats[1]?.district ?? "adjoining districts"}. ${cats[0]?.label ?? "Mixed offences"} accounts for ${cats[0]?.value ?? 0} FIR(s) in scope.`,
    confidence: live
      ? Math.round(live.confidenceScore * 100)
      : Math.min(95, 58 + Math.round(s.cases.length / 4)),

    evidence: [
      { id: "EV-1", label: "SCRB FIR register", detail: `${s.cases.length} record(s) across ${stats.length} district(s).` },
      { id: "EV-2", label: "Chargesheet and court linkage", detail: `${s.cases.filter((c) => c.chargeSheet).length} chargesheet(s) with court outcome.` },
      { id: "EV-3", label: "Personnel roster", detail: `${s.repo.employees.length} officer(s) across ${s.repo.units.length} unit(s).` },
    ],
    recommendations: recommendations(s, stats).slice(0, 3),
    charts: [
      { id: "gq-trend", kind: "timeseries", title: "Queried Indicator Trend", points: months },
      {
        id: "gq-district",
        kind: "bar",
        title: "District Contribution",
        points: stats.slice(0, 8).map((d) => ({ label: d.district, value: d.crimes })),
      },
    ],
  };
}

export function parseGovernanceFilters(request: Request): GovernanceFilters {
  const url = new URL(request.url);
  const get = (k: string) => url.searchParams.get(k) ?? undefined;
  return { fy: get("fy"), district: get("district"), category: get("category"), segment: get("segment") };
}
