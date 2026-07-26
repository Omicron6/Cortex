/**
 * Crime Intelligence Runtime — Investigator workspace.
 *
 * Data source: SCRB repository (Zoho Catalyst Stratus bucket).
 * All joins live in `@/services/scrb`; this module only shapes repository
 * records into the API contract consumed by the UI.
 */

import {
  getCase as repoGetCase,
  listCases as repoListCases,
  loadScrbRepository,
  type ScrbCase,
} from "@/services/scrb";
import { askCortex } from "@/services/cortex-runtime.server";
import type {
  BipProfile,
  CaseDetail,
  CaseStatistics,
  CaseSummaryDoc,
  CaseSummaryRow,
  ChatResponse,
  CinGraph,
  HistoryEntry,
  Suggestion,
  TimelineEvent,
} from "./investigation-types";

/* --------------------------- derivations --------------------------- */

function statistics(c: ScrbCase): CaseStatistics {
  const vehicles = new Set(c.accused.map((a) => a.vehicleNo).filter(Boolean)).size;
  const phones = new Set(
    [...c.accused, ...c.victims, ...c.complainants].map((p) => p.phone).filter(Boolean),
  ).size;
  return {
    evidence: c.accused.length * 3 + c.victims.length * 2 + c.arrests.length,
    witnesses: c.complainants.length + c.victims.length,
    accused: c.accused.length,
    victims: c.victims.length,
    vehicles,
    phones,
    bankAccounts: c.arrests.length,
    digitalEvidence: phones + vehicles,
  };
}

function progress(c: ScrbCase): CaseDetail["progress"] {
  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : undefined;
  const arrested = c.arrests.length > 0;
  const sheeted = Boolean(c.chargeSheet);
  const accepted = /accepted/i.test(c.status);
  const inCourt = sheeted && !/return/i.test(c.status);

  const stage = (label: string, done: boolean, active: boolean, at?: string) => ({
    stage: label,
    state: done ? ("done" as const) : active ? ("active" as const) : ("pending" as const),
    at: done ? at : active ? "in progress" : undefined,
  });

  return [
    stage("Registered", true, false, fmt(c.registeredAt)),
    stage("Assigned", Boolean(c.investigatingOfficer), !c.investigatingOfficer),
    stage("Evidence Collection", arrested || sheeted, !arrested && !sheeted),
    stage("Witness Examination", c.victims.length > 0 || sheeted, !sheeted && c.victims.length === 0),
    stage("Accused Identified", c.accused.length > 0, c.accused.length === 0),
    stage("Arrest", arrested, !arrested && c.accused.length > 0, fmt(c.arrests[0]?.arrestDate)),
    stage("Chargesheet", sheeted, !sheeted && arrested, fmt(c.chargeSheet?.fileDate)),
    stage("Court", inCourt, sheeted && !inCourt),
    stage("Completed", accepted, inCourt && !accepted),
  ];
}

function toSummaryRow(c: ScrbCase): CaseSummaryRow {
  return {
    caseId: c.caseId,
    firNumber: c.firNumber,
    crimeType: c.crimeType,
    station: c.unit?.unitName ?? c.court?.courtName ?? "Unassigned Unit",
    status: c.status,
    priority: c.priority,
    registeredAt: c.registeredAt,
  };
}

function toDetail(c: ScrbCase): CaseDetail {
  return {
    ...toSummaryRow(c),
    officer: c.investigatingOfficer
      ? `${c.investigatingOfficer.rank} ${c.investigatingOfficer.fullName}`
      : c.officerName,
    officerId: c.investigatingOfficer
      ? `KSP-OFFICER-${String(c.investigatingOfficer.employeeId).padStart(4, "0")}`
      : "UNASSIGNED",
    location: c.location,
    sections: c.section ? [`${c.act?.abbreviation ?? "ACT"} ${c.section.sectionNo}`] : [],
    statistics: statistics(c),
    progress: progress(c),
  };
}

/* ------------------------------ API -------------------------------- */

export async function listCases(): Promise<CaseSummaryRow[]> {
  return (await repoListCases()).map(toSummaryRow);
}

export async function getCase(caseId: string): Promise<CaseDetail | undefined> {
  const c = await repoGetCase(caseId);
  return c ? toDetail(c) : undefined;
}

export async function getTimeline(caseId: string): Promise<TimelineEvent[]> {
  const c = await repoGetCase(caseId);
  if (!c) return [];
  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const events: TimelineEvent[] = [
    {
      id: "TL-FIR",
      at: fmt(c.registeredAt),
      title: `FIR registered — ${c.firNumber}`,
      detail: `${c.crimeType} recorded at ${c.unit?.unitName ?? "district unit"}, ${c.district?.districtName ?? "Karnataka"}.`,
      actor: c.officerName,
      tone: "info",
    },
  ];

  c.complainants.forEach((p, i) =>
    events.push({
      id: `TL-CMP-${p.id}`,
      at: fmt(c.registeredAt),
      title: `Complaint statement recorded (${i + 1})`,
      detail: `${p.firstName} ${p.lastName}, ${p.age} · ${p.address}`,
      actor: "Duty Officer",
      tone: "info",
    }),
  );

  c.victims.forEach((v) =>
    events.push({
      id: `TL-VIC-${v.id}`,
      at: fmt(c.registeredAt),
      title: "Victim particulars indexed",
      detail: `${v.firstName} ${v.lastName} · ${v.gender} · age ${v.age}`,
      actor: "SCRB Record",
      tone: v.age < 18 ? "critical" : "info",
    }),
  );

  c.accused.forEach((a) =>
    events.push({
      id: `TL-ACC-${a.accusedId}`,
      at: fmt(c.registeredAt),
      title: `Accused identified — ${a.name}`,
      detail: `${a.repeatOffender ? "Repeat offender flagged. " : ""}Vehicle ${a.vehicleNo || "not recorded"} · ${a.address}`,
      actor: "CORTEX Entity Resolution",
      tone: a.repeatOffender ? "critical" : "warning",
    }),
  );

  c.arrests.forEach((a) =>
    events.push({
      id: `TL-ARR-${a.arrestId}`,
      at: fmt(a.arrestDate),
      title: "Arrest executed",
      detail: `Arrest at ${a.arrestPlace} by ${a.arrestingOfficer}.`,
      actor: a.arrestingOfficer,
      tone: "success",
    }),
  );

  if (c.chargeSheet) {
    events.push({
      id: "TL-CS",
      at: fmt(c.chargeSheet.fileDate),
      title: `Chargesheet ${c.chargeSheet.status}`,
      detail: `${c.chargeSheet.description} · Filed by ${c.chargeSheet.fileBy} at ${c.court?.courtName ?? "court"}.`,
      actor: c.chargeSheet.fileBy,
      tone: /accepted/i.test(c.chargeSheet.status)
        ? "success"
        : /rejected|return/i.test(c.chargeSheet.status)
          ? "critical"
          : "warning",
    });
  }

  return events;
}

export async function getSuggestions(caseId: string): Promise<Suggestion[]> {
  const repo = await loadScrbRepository();
  const c = repo.caseByCaseId.get(caseId) ?? (await repoGetCase(caseId));
  if (!c) return [];

  const suggestions: Suggestion[] = [];
  const repeat = c.accused.filter((a) => a.repeatOffender);
  if (repeat.length) {
    suggestions.push({
      id: "SG-REPEAT",
      title: `Repeat offender detected (${repeat.length})`,
      detail: `${repeat.map((a) => a.name).join(", ")} carry prior-offence flags in SCRB records.`,
      tone: "critical",
      action: "open-bip",
    });
  }

  const vehicles = c.accused.map((a) => a.vehicleNo).filter(Boolean);
  if (vehicles.length) {
    const shared = repo.accused.filter(
      (a) => vehicles.includes(a.vehicleNo) && a.firId !== c.firId,
    );
    suggestions.push({
      id: "SG-VEHICLE",
      title: shared.length ? `Vehicle linked to ${shared.length} other FIR(s)` : "Vehicle trace",
      detail: `${vehicles.join(", ")} appears across ${shared.length + 1} SCRB record(s).`,
      tone: shared.length ? "warning" : "info",
      action: "similar-cases",
    });
  }

  const phones = new Set(c.accused.map((a) => a.phone).filter(Boolean));
  const sharedPhone = repo.accused.filter((a) => phones.has(a.phone) && a.firId !== c.firId);
  if (sharedPhone.length) {
    suggestions.push({
      id: "SG-PHONE",
      title: "Shared phone identifier",
      detail: `Contact number correlates with ${sharedPhone.length} accused record(s) in other FIRs.`,
      tone: "warning",
      action: "find-associates",
    });
  }

  if (!c.arrests.length && c.accused.length) {
    suggestions.push({
      id: "SG-ARREST",
      title: "Arrest pending",
      detail: `${c.accused.length} accused identified with no arrest recorded against ${c.firNumber}.`,
      tone: "critical",
      action: "open-cin",
    });
  }

  if (c.chargeSheet && /return|rejected/i.test(c.chargeSheet.status)) {
    suggestions.push({
      id: "SG-CS",
      title: `Chargesheet ${c.chargeSheet.status.toLowerCase()}`,
      detail: `${c.court?.courtName ?? "Court"} requires re-submission. Section ${c.section?.sectionNo ?? "—"}.`,
      tone: "critical",
      action: "generate-report",
    });
  }

  suggestions.push({
    id: "SG-SECTION",
    title: `Section applied — ${c.section?.sectionNo ?? "not recorded"}`,
    detail: c.section
      ? `${c.section.description}. Punishment: ${c.section.punishment}.`
      : "No statutory section linked to this FIR yet.",
    tone: c.section ? "info" : "warning",
    action: "view-evidence",
  });

  return suggestions;
}

export async function getSummary(caseId: string): Promise<CaseSummaryDoc | null> {
  const c = await repoGetCase(caseId);
  if (!c) return null;
  const stats = statistics(c);
  return {
    caseId: c.caseId,
    generatedAt: new Date().toISOString(),
    headline: `Investigation summary — ${c.firNumber}`,
    paragraphs: [
      `${c.crimeType} registered under ${c.act?.actName ?? "applicable law"} ${c.section?.sectionNo ?? ""} at ${c.unit?.unitName ?? "district unit"}, ${c.district?.districtName ?? "Karnataka"}. Current chargesheet status: ${c.status}, priority ${c.priority.toLowerCase()}.`,
      `${stats.accused} accused, ${stats.victims} victim(s) and ${stats.witnesses} statement(s) are indexed against this FIR. ${c.arrests.length} arrest(s) recorded${c.arrests[0] ? ` — latest at ${c.arrests[0].arrestPlace} by ${c.arrests[0].arrestingOfficer}` : ""}. Entity resolution links ${stats.phones} phone identifier(s) and ${stats.vehicles} vehicle record(s).`,
      c.chargeSheet
        ? `Chargesheet ${c.chargeSheet.sheetId} filed on ${c.chargeSheet.fileDate} by ${c.chargeSheet.fileBy} before ${c.court?.courtName ?? "court"} (${c.court?.courtType ?? "—"}). Statutory punishment: ${c.section?.punishment ?? "not specified"}.`
        : `No chargesheet has been filed against ${c.firNumber}. Runtime recommends completing evidence consolidation before submission.`,
    ],
    confidence: c.chargeSheet ? 0.91 : 0.74,
  };
}

export async function getCin(caseId: string): Promise<CinGraph> {
  const repo = await loadScrbRepository();
  const c = repo.caseByCaseId.get(caseId);
  if (!c) return { caseId, nodes: [], edges: [], relationshipTypes: [] };

  const nodes: CinGraph["nodes"] = [
    { id: `CASE-${c.firId}`, label: c.firNumber, type: "Case", risk: 0.6 },
  ];
  const edges: CinGraph["edges"] = [];

  for (const a of c.accused) {
    const pid = `P-${a.accusedId}`;
    nodes.push({
      id: pid,
      label: a.name,
      type: "Person",
      risk: a.repeatOffender ? 0.88 : 0.62,
    });
    edges.push({ from: pid, to: `CASE-${c.firId}`, type: "accused_in", weight: 0.9 });
    if (a.vehicleNo) {
      nodes.push({ id: `V-${a.vehicleNo}`, label: a.vehicleNo, type: "Vehicle", risk: 0.55 });
      edges.push({ from: pid, to: `V-${a.vehicleNo}`, type: "uses_vehicle", weight: 0.72 });
      for (const other of repo.accused) {
        if (other.vehicleNo === a.vehicleNo && other.firId !== c.firId) {
          const oc = repo.caseByFirId.get(other.firId);
          if (!oc) continue;
          nodes.push({ id: `CASE-${oc.firId}`, label: oc.firNumber, type: "Case", risk: 0.5 });
          edges.push({
            from: `V-${a.vehicleNo}`,
            to: `CASE-${oc.firId}`,
            type: "linked_offence",
            weight: 0.68,
          });
        }
      }
    }
    if (a.phone) {
      nodes.push({ id: `PH-${a.phone}`, label: a.phone, type: "Phone", risk: 0.5 });
      edges.push({ from: pid, to: `PH-${a.phone}`, type: "uses_phone", weight: 0.8 });
    }
  }

  for (const v of c.victims) {
    const vid = `VIC-${v.id}`;
    nodes.push({ id: vid, label: `${v.firstName} ${v.lastName}`, type: "Victim", risk: 0.25 });
    edges.push({ from: vid, to: `CASE-${c.firId}`, type: "victim_of", weight: 0.85 });
  }

  for (const p of c.complainants) {
    const cid = `CMP-${p.id}`;
    nodes.push({ id: cid, label: `${p.firstName} ${p.lastName}`, type: "Complainant", risk: 0.15 });
    edges.push({ from: cid, to: `CASE-${c.firId}`, type: "reported", weight: 0.7 });
  }

  for (const a of c.arrests) {
    const oid = `OFF-${a.arrestingOfficer}`;
    nodes.push({ id: oid, label: a.arrestingOfficer, type: "Officer", risk: 0.1 });
    edges.push({ from: oid, to: `CASE-${c.firId}`, type: "investigates", weight: 0.6 });
  }

  if (c.court) {
    nodes.push({ id: `CRT-${c.court.courtId}`, label: c.court.courtName, type: "Court", risk: 0.2 });
    edges.push({
      from: `CASE-${c.firId}`,
      to: `CRT-${c.court.courtId}`,
      type: "filed_before",
      weight: 0.75,
    });
  }

  const unique = new Map(nodes.map((n) => [n.id, n]));
  return {
    caseId,
    nodes: [...unique.values()],
    edges,
    relationshipTypes: [...new Set(edges.map((e) => e.type))],
  };
}

export async function getBip(caseId: string): Promise<BipProfile> {
  const repo = await loadScrbRepository();
  const c = repo.caseByCaseId.get(caseId);
  const subject = c?.accused[0];

  if (!c || !subject) {
    return {
      caseId,
      subject: "No accused on record",
      behaviourSummary: "Behavioural profiling requires at least one identified accused.",
      riskScore: 0,
      repeatOffenderProbability: 0,
      knownMo: [],
      crimeFrequency: [],
      psychologicalIndicators: [],
      priorityLevel: "Low",
    };
  }

  const priors = repo.accused.filter(
    (a) =>
      a.accusedId !== subject.accusedId &&
      (a.name === subject.name || (a.phone && a.phone === subject.phone)),
  );
  const relatedFirs = new Set([c.firId, ...priors.map((p) => p.firId)]);
  const relatedCases = [...relatedFirs]
    .map((id) => repo.caseByFirId.get(id))
    .filter((x): x is ScrbCase => Boolean(x));

  const freq = new Map<string, number>();
  for (const rc of relatedCases) {
    if (!rc.registeredAt) continue;
    const label = new Date(rc.registeredAt).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    freq.set(label, (freq.get(label) ?? 0) + 1);
  }

  const arrested = relatedCases.filter((rc) => rc.arrests.length).length;
  const risk = Math.min(
    0.98,
    0.4 +
      (subject.repeatOffender ? 0.25 : 0) +
      priors.length * 0.08 +
      (c.accused.length > 1 ? 0.08 : 0),
  );

  return {
    caseId,
    subject: subject.name,
    behaviourSummary: `${subject.name} is linked to ${relatedCases.length} SCRB record(s)${subject.vehicleNo ? ` and operates using vehicle ${subject.vehicleNo}` : ""}. ${subject.repeatOffender ? "Flagged as a repeat offender in the accused register." : "No repeat-offender flag on record."} Last known address: ${subject.address}. ${arrested} of the linked cases resulted in a recorded arrest.`,
    riskScore: Number(risk.toFixed(2)),
    repeatOffenderProbability: Number(
      Math.min(0.97, (subject.repeatOffender ? 0.7 : 0.3) + priors.length * 0.1).toFixed(2),
    ),
    knownMo: [
      subject.vehicleNo ? `Vehicle used: ${subject.vehicleNo}` : "No vehicle recorded",
      c.crimeSubHead ? `Primary offence: ${c.crimeSubHead.subHeadName}` : "Offence unclassified",
      c.section ? `Booked under ${c.act?.abbreviation ?? ""} ${c.section.sectionNo}` : "Section pending",
      `Operating district: ${c.district?.districtName ?? "unknown"}`,
    ],
    crimeFrequency: [...freq.entries()].map(([label, value]) => ({ label, value })),
    psychologicalIndicators: [
      { label: "Recidivism signal", value: subject.repeatOffender ? 0.82 : 0.34 },
      { label: "Network reliance", value: Math.min(0.95, c.accused.length * 0.3) },
      { label: "Mobility", value: subject.vehicleNo ? 0.71 : 0.29 },
      { label: "Evasion", value: c.arrests.length ? 0.28 : 0.76 },
    ],
    priorityLevel: risk > 0.8 ? "Critical" : risk > 0.6 ? "High" : "Medium",
  };
}

export async function getHistory(caseId?: string): Promise<HistoryEntry[]> {
  const repo = await loadScrbRepository();
  const source = caseId
    ? repo.cases.filter((c) => c.caseId === caseId)
    : repo.cases.filter((c) => c.chargeSheet).slice(0, 12);

  return source.map((c) => ({
    id: `CONV-${c.firId}`,
    timestamp: c.chargeSheet?.fileDate
      ? new Date(c.chargeSheet.fileDate).toISOString()
      : c.registeredAt,
    officer: c.officerName,
    caseId: c.caseId,
    summary: `${c.crimeType} · ${c.status} · ${c.district?.districtName ?? "Karnataka"} — ${c.accused.length} accused, ${c.arrests.length} arrest(s).`,
    reports: [
      c.chargeSheet ? `Chargesheet #${c.chargeSheet.sheetId}` : "Investigation Summary",
      c.section ? `Section ${c.section.sectionNo} Brief` : "Section Pending Note",
    ],
  }));
}

export async function runChat(input: {
  caseId: string;
  role: string;
  message: string;
  conversationId?: string;
  images?: string[];
}): Promise<ChatResponse> {
  const repo = await loadScrbRepository();
  const c = repo.caseByCaseId.get(input.caseId);
  const stats = c ? statistics(c) : null;
  const repeat = c?.accused.filter((a) => a.repeatOffender) ?? [];

  const caseContext = c
    ? `Case context — FIR ${c.firNumber}; crime head ${c.crimeType}; district ${c.district?.districtName ?? "Karnataka"}; statute ${c.act?.abbreviation ?? "NA"} ${c.section?.sectionNo ?? ""}; ${c.accused.length} accused (${repeat.length} repeat offenders); ${c.arrests.length} arrest(s); status ${c.status}.`
    : `No SCRB record matches ${input.caseId}.`;

  const live = await askCortex({
    persona: "AIC",
    question: `${caseContext}\n\nInvestigating Officer question: ${input.message}`,
    district: c?.district?.districtName,
    images: input.images,
  });

  const confidence = live
    ? live.confidenceScore
    : c
      ? c.chargeSheet
        ? 0.9
        : c.arrests.length
          ? 0.78
          : 0.64
      : 0.4;
  const band = confidence >= 0.8 ? "high" : confidence >= 0.65 ? "medium" : "low";

  return {
    conversationId: input.conversationId ?? `CONV-${Date.now()}`,
    messageId: `MSG-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    answer:
      live?.answer ??
      (c
        ? `Runtime analysed ${c.firNumber} against the SCRB knowledge graph. The FIR is registered as ${c.crimeType} in ${c.district?.districtName ?? "Karnataka"} under ${c.act?.abbreviation ?? "applicable act"} ${c.section?.sectionNo ?? ""}. ${c.accused.length} accused are on record${repeat.length ? `, of which ${repeat.length} carry repeat-offender flags` : ""}. ${c.arrests.length} arrest(s) have been executed and the chargesheet status is "${c.status}".`
        : `No SCRB record matches ${input.caseId}.`),

    evidence: [
      ...(live?.evidence.map((label, i) => ({
        id: `KB-${i + 1}`,
        label,
        detail: "Knowledge base document retrieved by the CORTEX RAG runtime.",
      })) ?? []),
      ...(c?.accused.slice(0, 3).map((a) => ({
        id: `ACC-${a.accusedId}`,
        label: a.name,
        detail: `${a.repeatOffender ? "Repeat offender · " : ""}${a.vehicleNo || "no vehicle"} · ${a.phone}`,
      })) ?? []),
    ],
    reasoning: [
      ...(live
        ? [
            {
              step: "CORTEX runtime",
              detail: `${live.reasoning} · ${live.sources.join(", ") || "QuickML RAG"} · confidence ${live.confidence}.`,
              confidence: live.confidenceScore,
            },
          ]
        : []),
      {
        step: "Record retrieval",
        detail: `FIR ${c?.firNumber ?? input.caseId} resolved from SCRB chargesheet register.`,
        confidence: 0.96,
      },
      {
        step: "Entity resolution",
        detail: `${stats?.phones ?? 0} phone identifier(s) and ${stats?.vehicles ?? 0} vehicle(s) joined to the FIR.`,
        confidence: 0.88,
      },
      {
        step: "Recidivism check",
        detail: `${repeat.length} accused matched the repeat-offender register.`,
        confidence: repeat.length ? 0.85 : 0.6,
      },
      {
        step: "Judicial state",
        detail: c?.chargeSheet
          ? `Chargesheet ${c.chargeSheet.status} at ${c.court?.courtName ?? "court"}.`
          : "No chargesheet filed.",
        confidence: 0.92,
      },
    ],

    confidence,
    confidenceBand: band,
    suggestedActions: [
      { id: "open-cin", label: "Open CIN" },
      { id: "generate-timeline", label: "Generate Timeline" },
      { id: "open-bip", label: "Open BIP" },
      { id: "generate-report", label: "Generate Report" },
      { id: "similar-cases", label: "Show Similar Cases" },
      { id: "find-associates", label: "Find Associates" },
      { id: "view-evidence", label: "View Evidence" },
    ],
    references: [
      { id: "REF-1", label: c?.firNumber ?? input.caseId, source: "SCRB / CCTNS" },
      { id: "REF-2", label: c?.court?.courtName ?? "Court record", source: "SCRB Court Register" },
      {
        id: "REF-3",
        label: c?.section ? `${c.act?.abbreviation} ${c.section.sectionNo}` : "Section register",
        source: "SCRB Statute Master",
      },
    ],
    nextSteps: [
      c && !c.arrests.length ? "Execute pending arrest against identified accused." : "Verify arrest documentation completeness.",
      c && !c.chargeSheet ? "Prepare chargesheet for submission." : "Track court proceedings for the filed chargesheet.",
      repeat.length ? "Pull prior FIR history for flagged repeat offenders." : "Run cross-district vehicle correlation.",
    ],
  };
}
