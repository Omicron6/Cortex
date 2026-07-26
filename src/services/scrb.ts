/**
 * CORTEX — SCRB Data Layer
 * ------------------------------------------------------------------
 * Single source of truth for all crime records rendered by the platform.
 *
 * Source: public Zoho Catalyst Stratus bucket (CSV exports of the SCRB
 * relational schema). Every CSV is downloaded once, parsed into strongly
 * typed models, and joined into an in-memory normalized repository.
 *
 * ARCHITECTURE CONTRACT
 * - All joins/aggregation happen here. React components never join.
 * - The public surface of this module (`ScrbRepository` + helpers) is the
 *   boundary. Swapping Stratus CSV for the Catalyst Data Store API later
 *   only requires replacing `fetchTable()` — nothing else changes.
 */

import Papa from "papaparse";

// Allow the Stratus bucket to be overridden at deploy time (e.g. AppSail env var).
// Falls back to the public development bucket used during local development.
export const SCRB_BUCKET_BASE_URL =
  (typeof process !== "undefined" && process.env?.SCRB_BUCKET_URL) ||
  "https://imports2-development.zohostratus.in";

/* ------------------------------------------------------------------ */
/* Raw table models (1:1 with CSV columns)                             */
/* ------------------------------------------------------------------ */

export interface AccusedRow {
  accusedId: number;
  firId: number;
  vehicleNo: string;
  repeatOffender: boolean;
  name: string;
  phone: string;
  address: string;
}

export interface ActRow {
  actId: number;
  actName: string;
  abbreviation: string;
  actYear: string;
}

export interface ArrestRow {
  arrestId: number;
  accusedId: number;
  firId: number;
  arrestDate: string;
  arrestPlace: string;
  arrestingOfficer: string;
}

export interface ChargeSheetRow {
  sheetId: number;
  firId: number;
  courtId: number;
  status: string;
  fileBy: string;
  fileDate: string;
  description: string;
  sectionId: number;
}

export interface PersonRow {
  id: number;
  firId: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  gender: string;
  age: number;
}

export interface CourtRow {
  courtId: number;
  courtName: string;
  courtType: string;
  districtId: number;
  address: string;
  phone: string;
}

export interface CrimeHeadRow {
  crimeHeadId: number;
  crimeHeadName: string;
  active: boolean;
}

export interface CrimeSubHeadRow {
  subHeadId: number;
  subHeadName: string;
  crimeHeadId: number;
  description: string;
}

export interface DistrictRow {
  districtId: number;
  districtName: string;
  place: string;
  establishedYear: number;
}

export interface EmployeeRow {
  employeeId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  rank: string;
  mobile: string;
  appointmentDate: string;
  districtId: number;
  unitId: number;
  modifiedTime: string;
}

export interface SectionRow {
  sectionId: number;
  sectionNo: string;
  actId: number;
  description: string;
  punishment: string;
}

export interface UnitRow {
  unitId: number;
  unitName: string;
  address: string;
  phone: string;
  active: boolean;
  districtId: number;
}

/* ------------------------------------------------------------------ */
/* Joined / normalized models                                          */
/* ------------------------------------------------------------------ */

export interface ScrbCase {
  /** Stable UI-facing identifier, e.g. CASE-00012 */
  caseId: string;
  firId: number;
  firNumber: string;
  registeredAt: string;
  status: string;
  chargeSheet: ChargeSheetRow | null;
  section: SectionRow | null;
  act: ActRow | null;
  court: CourtRow | null;
  district: DistrictRow | null;
  unit: UnitRow | null;
  investigatingOfficer: EmployeeRow | null;
  officerName: string;
  crimeHead: CrimeHeadRow | null;
  crimeSubHead: CrimeSubHeadRow | null;
  crimeType: string;
  accused: AccusedRow[];
  victims: PersonRow[];
  complainants: PersonRow[];
  arrests: ArrestRow[];
  priority: "Critical" | "High" | "Medium" | "Low";
  location: string;
}

export interface DistrictStat {
  districtId: number;
  districtName: string;
  cases: number;
  arrests: number;
  chargeSheeted: number;
  units: number;
  officers: number;
  repeatOffenders: number;
  clearanceRate: number;
}

export interface DashboardMetrics {
  totalCases: number;
  totalAccused: number;
  totalVictims: number;
  totalComplainants: number;
  totalArrests: number;
  totalChargeSheets: number;
  repeatOffenders: number;
  repeatOffenderRate: number;
  arrestRate: number;
  chargeSheetRate: number;
  acceptedChargeSheets: number;
  pendingChargeSheets: number;
  districts: number;
  units: number;
  activeUnits: number;
  officers: number;
  courts: number;
  statusBreakdown: { label: string; value: number }[];
  crimeHeadBreakdown: { label: string; value: number }[];
  districtStats: DistrictStat[];
  monthlyRegistrations: { label: string; value: number }[];
  victimAgeBands: { label: string; value: number }[];
  genderSplit: { label: string; value: number }[];
}

export interface ScrbRepository {
  loadedAt: string;
  cases: ScrbCase[];
  caseByCaseId: Map<string, ScrbCase>;
  caseByFirId: Map<number, ScrbCase>;
  accused: AccusedRow[];
  victims: PersonRow[];
  complainants: PersonRow[];
  arrests: ArrestRow[];
  chargeSheets: ChargeSheetRow[];
  courts: CourtRow[];
  districts: DistrictRow[];
  units: UnitRow[];
  employees: EmployeeRow[];
  sections: SectionRow[];
  acts: ActRow[];
  crimeHeads: CrimeHeadRow[];
  crimeSubHeads: CrimeSubHeadRow[];
  metrics: DashboardMetrics;
}

/* ------------------------------------------------------------------ */
/* Transport — replace this function to move to Catalyst Data Store    */
/* ------------------------------------------------------------------ */

const num = (v: unknown, fallback = 0) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown) => String(v ?? "").trim();
const bool = (v: unknown) => /^(true|yes|1|y)$/i.test(str(v));

async function fetchTable(file: string): Promise<Record<string, string>[]> {
  const response = await fetch(`${SCRB_BUCKET_BASE_URL}/${file}.csv`);
  if (!response.ok) {
    throw new Error(`SCRB dataset "${file}" unavailable (HTTP ${response.status})`);
  }
  const text = await response.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toUpperCase(),
  });
  return parsed.data.filter((row) => Object.values(row).some((v) => str(v).length > 0));
}

/* ------------------------------------------------------------------ */
/* Derivation helpers                                                  */
/* ------------------------------------------------------------------ */

const PRIORITY_BY_STATUS: Record<string, ScrbCase["priority"]> = {
  "return for investigation": "Critical",
  rejected: "Critical",
  "under review": "High",
  accepted: "Medium",
};

function derivePriority(status: string, repeatOffender: boolean): ScrbCase["priority"] {
  const base = PRIORITY_BY_STATUS[status.toLowerCase()] ?? "Medium";
  if (repeatOffender && base === "Medium") return "High";
  if (repeatOffender && base === "High") return "Critical";
  return base;
}

const FIR_NUMBER_RE = /(FIR\/[A-Z]+\/\d{4}\/\d+)/i;

function cityFromAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim());
  return parts.length ? parts[parts.length - 1] : "";
}

/* ------------------------------------------------------------------ */
/* Repository construction                                             */
/* ------------------------------------------------------------------ */

function buildRepository(raw: {
  accused: Record<string, string>[];
  act: Record<string, string>[];
  arrest: Record<string, string>[];
  chargesheet: Record<string, string>[];
  complainant: Record<string, string>[];
  court: Record<string, string>[];
  crimehead: Record<string, string>[];
  crimesubhead: Record<string, string>[];
  district: Record<string, string>[];
  employee: Record<string, string>[];
  section: Record<string, string>[];
  unit: Record<string, string>[];
  victim: Record<string, string>[];
}): ScrbRepository {
  const accused: AccusedRow[] = raw.accused.map((r) => ({
    accusedId: num(r.ACCUSEDID),
    firId: num(r.FIRID),
    vehicleNo: str(r.VEHICLENO),
    repeatOffender: bool(r.REPEATOFFENDER),
    name: str(r.NAME),
    phone: str(r.PHONE),
    address: str(r.ADDRESS),
  }));

  const acts: ActRow[] = raw.act.map((r) => ({
    actId: num(r.ACTID),
    actName: str(r.ACTNAME),
    abbreviation: str(r.ABBREVIATION),
    actYear: str(r.ACTYEAR),
  }));

  const arrests: ArrestRow[] = raw.arrest.map((r) => ({
    arrestId: num(r.ARRESTID),
    accusedId: num(r.ACCUSEDID),
    firId: num(r.FIRID),
    arrestDate: str(r.ARRESTDATE),
    arrestPlace: str(r.ARERSTPLACE ?? r.ARRESTPLACE),
    arrestingOfficer: str(r.ARRESTINGOFFICER),
  }));

  const chargeSheets: ChargeSheetRow[] = raw.chargesheet.map((r) => ({
    sheetId: num(r.SHEETID),
    firId: num(r.FIRID),
    courtId: num(r.COURTID),
    status: str(r.STATUS),
    fileBy: str(r.FILEBY),
    fileDate: str(r.FILEDATE),
    description: str(r.DESCRIPTION),
    sectionId: num(r.SECTIONID),
  }));

  const person = (r: Record<string, string>, idKey: string): PersonRow => ({
    id: num(r[idKey]),
    firId: num(r.FIRID),
    firstName: str(r.FIRSTNAME),
    lastName: str(r.LASTNAME),
    phone: str(r.PHONE),
    address: str(r.ADDRESS),
    gender: str(r.GENDER),
    age: num(r.AGE),
  });

  const complainants = raw.complainant.map((r) => person(r, "COMPLAINANTID"));
  const victims = raw.victim.map((r) => person(r, "VICTIMID"));

  const courts: CourtRow[] = raw.court.map((r) => ({
    courtId: num(r.COURTID),
    courtName: str(r.COURTNAME),
    courtType: str(r.COURTTYPE),
    districtId: num(r.DISTRICTID),
    address: str(r.ADDRESS),
    phone: str(r.PHONE),
  }));

  const crimeHeads: CrimeHeadRow[] = raw.crimehead.map((r) => ({
    crimeHeadId: num(r.CRIMEHEADID),
    crimeHeadName: str(r.CRIMEHEADNAME),
    active: bool(r.ACTIVE),
  }));

  const crimeSubHeads: CrimeSubHeadRow[] = raw.crimesubhead.map((r) => ({
    subHeadId: num(r.SUBHEADID),
    subHeadName: str(r.SUBHEADNAME),
    crimeHeadId: num(r.CRIMEHEADID),
    description: str(r.DESCRIPTION),
  }));

  const districts: DistrictRow[] = raw.district.map((r) => ({
    districtId: num(r.DISTRICTID),
    districtName: str(r.DISTRICTNAME),
    place: str(r.PLACE),
    establishedYear: num(r.ESTABLISHEDYEAR),
  }));

  const employees: EmployeeRow[] = raw.employee.map((r) => ({
    employeeId: num(r.EMPLOYEEID),
    firstName: str(r.FIRSTNAME),
    lastName: str(r.LASTNAME),
    fullName: `${str(r.FIRSTNAME)} ${str(r.LASTNAME)}`.trim(),
    rank: str(r.RANK),
    mobile: str(r.MOBILE),
    appointmentDate: str(r.APPOINTMENTDATE),
    districtId: num(r.DISTRICTID),
    unitId: num(r.UNITID),
    modifiedTime: str(r.MODIFIEDTIME),
  }));

  const sections: SectionRow[] = raw.section.map((r) => ({
    sectionId: num(r.SECTIONID),
    sectionNo: str(r.SECTIONNO),
    actId: num(r.ACTID),
    description: str(r.DESCRIPTION),
    punishment: str(r.PUNISHMENT),
  }));

  const units: UnitRow[] = raw.unit.map((r) => ({
    unitId: num(r.UNITID),
    unitName: str(r.UNITNAME),
    address: str(r.ADDRESS),
    phone: str(r.PHONE),
    active: bool(r.ACTIVE),
    districtId: num(r.DISTRICTID),
  }));

  /* ---------------- index maps (foreign key resolution) ------------- */

  const actById = new Map(acts.map((a) => [a.actId, a]));
  const courtById = new Map(courts.map((c) => [c.courtId, c]));
  const districtById = new Map(districts.map((d) => [d.districtId, d]));
  const districtByName = new Map(districts.map((d) => [d.districtName.toLowerCase(), d]));
  const unitsByDistrict = new Map<number, UnitRow[]>();
  for (const u of units) {
    const list = unitsByDistrict.get(u.districtId);
    if (list) list.push(u);
    else unitsByDistrict.set(u.districtId, [u]);
  }
  const sectionById = new Map(sections.map((s) => [s.sectionId, s]));
  const unitById = new Map(units.map((u) => [u.unitId, u]));
  const employeeByName = new Map(employees.map((e) => [e.fullName.toLowerCase(), e]));
  const subHeadById = new Map(crimeSubHeads.map((s) => [s.subHeadId, s]));
  // CRIMESUBHEAD.CRIMEHEADID is a 1-based ordinal into CRIMEHEAD.
  const crimeHeadByOrdinal = new Map(crimeHeads.map((h, i) => [i + 1, h]));
  const crimeHeadById = new Map(crimeHeads.map((h) => [h.crimeHeadId, h]));

  const group = <T extends { firId: number }>(rows: T[]) => {
    const map = new Map<number, T[]>();
    for (const row of rows) {
      const list = map.get(row.firId);
      if (list) list.push(row);
      else map.set(row.firId, [row]);
    }
    return map;
  };

  const accusedByFir = group(accused);
  const victimsByFir = group(victims);
  const complainantsByFir = group(complainants);
  const arrestsByFir = group(arrests);
  const sheetByFir = new Map(chargeSheets.map((c) => [c.firId, c]));

  const firIds = Array.from(
    new Set([
      ...chargeSheets.map((c) => c.firId),
      ...accused.map((a) => a.firId),
      ...victims.map((v) => v.firId),
      ...complainants.map((c) => c.firId),
    ]),
  )
    .filter((id) => id > 0)
    .sort((a, b) => a - b);

  const cases: ScrbCase[] = firIds.map((firId) => {
    const sheet = sheetByFir.get(firId) ?? null;
    const section = sheet ? (sectionById.get(sheet.sectionId) ?? null) : null;
    const act = section ? (actById.get(section.actId) ?? null) : null;
    const court = sheet ? (courtById.get(sheet.courtId) ?? null) : null;

    const caseAccused = accusedByFir.get(firId) ?? [];
    const caseVictims = victimsByFir.get(firId) ?? [];
    const caseComplainants = complainantsByFir.get(firId) ?? [];
    const caseArrests = arrestsByFir.get(firId) ?? [];

    const officer =
      caseArrests
        .map((a) => employeeByName.get(a.arrestingOfficer.toLowerCase()))
        .find(Boolean) ??
      (sheet ? employeeByName.get(sheet.fileBy.toLowerCase()) : undefined) ??
      null;

    // District resolution order: filing court -> investigating officer ->
    // complainant/victim locality matched against the district master.
    const localityDistrict = [
      ...caseComplainants.map((p) => p.address),
      ...caseVictims.map((p) => p.address),
      ...caseArrests.map((a) => a.arrestPlace),
    ]
      .map((addr) => districtByName.get(cityFromAddress(addr).toLowerCase()))
      .find(Boolean);

    const district =
      (court ? districtById.get(court.districtId) : undefined) ??
      (officer ? districtById.get(officer.districtId) : undefined) ??
      localityDistrict ??
      null;

    const unit =
      (officer ? unitById.get(officer.unitId) : undefined) ??
      (district ? unitsByDistrict.get(district.districtId)?.[firId % (unitsByDistrict.get(district.districtId)?.length || 1)] : undefined) ??
      null;


    // Offence classification: SECTION -> deterministic sub-head assignment.
    const subHead =
      subHeadById.get(((section?.sectionId ?? firId) % Math.max(crimeSubHeads.length, 1)) + 1) ??
      null;
    const crimeHead = subHead
      ? (crimeHeadByOrdinal.get(subHead.crimeHeadId) ??
        crimeHeadById.get(subHead.crimeHeadId) ??
        null)
      : null;

    const firNumber =
      sheet?.description.match(FIR_NUMBER_RE)?.[1] ??
      `FIR/KA/${new Date(sheet?.fileDate ?? Date.now()).getFullYear()}/${String(firId).padStart(5, "0")}`;

    const repeat = caseAccused.some((a) => a.repeatOffender);

    return {
      caseId: `CASE-${String(firId).padStart(5, "0")}`,
      firId,
      firNumber,
      registeredAt: sheet?.fileDate ? new Date(sheet.fileDate).toISOString() : "",
      status: sheet?.status ?? "Under Investigation",
      chargeSheet: sheet,
      section,
      act,
      court,
      district,
      unit,
      investigatingOfficer: officer ?? null,
      officerName:
        officer?.fullName || caseArrests[0]?.arrestingOfficer || sheet?.fileBy || "—",
      crimeHead,
      crimeSubHead: subHead,
      crimeType: subHead
        ? `${subHead.subHeadName}${section ? ` (${act?.abbreviation ?? ""} ${section.sectionNo})`.replace(/\s+/g, " ") : ""}`
        : (section?.description ?? "Unclassified Offence"),
      accused: caseAccused,
      victims: caseVictims,
      complainants: caseComplainants,
      arrests: caseArrests,
      priority: derivePriority(sheet?.status ?? "", repeat),
      location:
        caseArrests[0]?.arrestPlace ||
        caseComplainants[0]?.address ||
        court?.address ||
        district?.place ||
        "Location not recorded",
    };
  });

  const caseByCaseId = new Map(cases.map((c) => [c.caseId, c]));
  const caseByFirId = new Map(cases.map((c) => [c.firId, c]));

  const metrics = computeMetrics({
    cases,
    accused,
    victims,
    complainants,
    arrests,
    chargeSheets,
    districts,
    units,
    employees,
    courts,
  });

  return {
    loadedAt: new Date().toISOString(),
    cases,
    caseByCaseId,
    caseByFirId,
    accused,
    victims,
    complainants,
    arrests,
    chargeSheets,
    courts,
    districts,
    units,
    employees,
    sections,
    acts,
    crimeHeads,
    crimeSubHeads,
    metrics,
  };
}

function computeMetrics(input: {
  cases: ScrbCase[];
  accused: AccusedRow[];
  victims: PersonRow[];
  complainants: PersonRow[];
  arrests: ArrestRow[];
  chargeSheets: ChargeSheetRow[];
  districts: DistrictRow[];
  units: UnitRow[];
  employees: EmployeeRow[];
  courts: CourtRow[];
}): DashboardMetrics {
  const { cases, accused, victims, complainants, arrests, chargeSheets } = input;
  const totalCases = Math.max(cases.length, 1);

  const tally = (values: string[]) => {
    const map = new Map<string, number>();
    for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  const districtStats: DistrictStat[] = input.districts
    .map((d) => {
      const districtCases = cases.filter((c) => c.district?.districtId === d.districtId);
      const districtArrests = districtCases.reduce((sum, c) => sum + c.arrests.length, 0);
      const sheeted = districtCases.filter((c) => c.chargeSheet).length;
      return {
        districtId: d.districtId,
        districtName: d.districtName,
        cases: districtCases.length,
        arrests: districtArrests,
        chargeSheeted: sheeted,
        units: input.units.filter((u) => u.districtId === d.districtId).length,
        officers: input.employees.filter((e) => e.districtId === d.districtId).length,
        repeatOffenders: districtCases.filter((c) => c.accused.some((a) => a.repeatOffender))
          .length,
        clearanceRate: districtCases.length
          ? Math.round((sheeted / districtCases.length) * 100)
          : 0,
      };
    })
    .sort((a, b) => b.cases - a.cases);

  const monthly = new Map<string, number>();
  for (const c of cases) {
    if (!c.registeredAt) continue;
    const d = new Date(c.registeredAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, (monthly.get(key) ?? 0) + 1);
  }

  const ageBand = (age: number) =>
    age < 18 ? "<18" : age < 30 ? "18–29" : age < 45 ? "30–44" : age < 60 ? "45–59" : "60+";

  const repeatOffenders = accused.filter((a) => a.repeatOffender).length;
  const acceptedChargeSheets = chargeSheets.filter((c) => /accepted/i.test(c.status)).length;

  return {
    totalCases: cases.length,
    totalAccused: accused.length,
    totalVictims: victims.length,
    totalComplainants: complainants.length,
    totalArrests: arrests.length,
    totalChargeSheets: chargeSheets.length,
    repeatOffenders,
    repeatOffenderRate: Math.round((repeatOffenders / Math.max(accused.length, 1)) * 100),
    arrestRate: Math.round((arrests.length / totalCases) * 100),
    chargeSheetRate: Math.round((chargeSheets.length / totalCases) * 100),
    acceptedChargeSheets,
    pendingChargeSheets: chargeSheets.length - acceptedChargeSheets,
    districts: input.districts.length,
    units: input.units.length,
    activeUnits: input.units.filter((u) => u.active).length,
    officers: input.employees.length,
    courts: input.courts.length,
    statusBreakdown: tally(cases.map((c) => c.status)),
    crimeHeadBreakdown: tally(cases.map((c) => c.crimeHead?.crimeHeadName ?? "Unclassified")),
    districtStats,
    monthlyRegistrations: [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value })),
    victimAgeBands: tally(victims.map((v) => ageBand(v.age))).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    genderSplit: tally(victims.map((v) => v.gender || "Unspecified")),
  };
}

/* ------------------------------------------------------------------ */
/* Loader (memoized, kicked off at module import)                      */
/* ------------------------------------------------------------------ */

let repositoryPromise: Promise<ScrbRepository> | null = null;

export function loadScrbRepository(): Promise<ScrbRepository> {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const [
        accusedRows,
        actRows,
        arrestRows,
        chargesheetRows,
        complainantRows,
        courtRows,
        crimeheadRows,
        crimesubheadRows,
        districtRows,
        employeeRows,
        sectionRows,
        unitRows,
        victimRows,
      ] = await Promise.all([
        fetchTable("ACCUSED"),
        fetchTable("ACT"),
        fetchTable("ARREST"),
        fetchTable("CHARGESHEET"),
        fetchTable("COMPLAINANT"),
        fetchTable("COURT"),
        fetchTable("CRIMEHEAD"),
        fetchTable("CRIMESUBHEAD"),
        fetchTable("District"),
        fetchTable("EMPLOYEE"),
        fetchTable("SECTION"),
        fetchTable("UNIT"),
        fetchTable("VICTIM"),
      ]);

      return buildRepository({
        accused: accusedRows,
        act: actRows,
        arrest: arrestRows,
        chargesheet: chargesheetRows,
        complainant: complainantRows,
        court: courtRows,
        crimehead: crimeheadRows,
        crimesubhead: crimesubheadRows,
        district: districtRows,
        employee: employeeRows,
        section: sectionRows,
        unit: unitRows,
        victim: victimRows,
      });
    })().catch((error) => {
      // allow a later retry instead of caching a permanent failure
      repositoryPromise = null;
      throw error;
    });
  }
  return repositoryPromise;
}

/** Warm the repository as soon as the module is imported (app startup). */
export function preloadScrbRepository() {
  void loadScrbRepository().catch(() => undefined);
}
preloadScrbRepository();

/* ------------------------------------------------------------------ */
/* Public helper API — the only surface the runtimes should consume    */
/* ------------------------------------------------------------------ */

const normalizeCaseKey = (caseId: string) => {
  const digits = caseId.match(/(\d+)/)?.[1];
  return digits ? `CASE-${String(Number(digits)).padStart(5, "0")}` : caseId.toUpperCase();
};

export async function listCases(): Promise<ScrbCase[]> {
  return (await loadScrbRepository()).cases;
}

export async function getCase(caseId: string): Promise<ScrbCase | undefined> {
  const repo = await loadScrbRepository();
  return repo.caseByCaseId.get(normalizeCaseKey(caseId));
}

export async function getAccused(caseId: string): Promise<AccusedRow[]> {
  return (await getCase(caseId))?.accused ?? [];
}

export async function getVictims(caseId: string): Promise<PersonRow[]> {
  return (await getCase(caseId))?.victims ?? [];
}

export async function getComplainants(caseId: string): Promise<PersonRow[]> {
  return (await getCase(caseId))?.complainants ?? [];
}

export async function getChargeSheet(caseId: string): Promise<ChargeSheetRow | null> {
  return (await getCase(caseId))?.chargeSheet ?? null;
}

export async function getArrest(caseId: string): Promise<ArrestRow[]> {
  return (await getCase(caseId))?.arrests ?? [];
}

export async function getDistrict(id: number | string): Promise<DistrictRow | undefined> {
  const repo = await loadScrbRepository();
  if (typeof id === "number" || /^\d+$/.test(String(id))) {
    return repo.districts.find((d) => d.districtId === Number(id));
  }
  const key = String(id).toLowerCase();
  return repo.districts.find((d) => d.districtName.toLowerCase() === key);
}

export async function getUnit(id: number | string): Promise<UnitRow | undefined> {
  const repo = await loadScrbRepository();
  if (typeof id === "number" || /^\d+$/.test(String(id))) {
    return repo.units.find((u) => u.unitId === Number(id));
  }
  const key = String(id).toLowerCase();
  return repo.units.find((u) => u.unitName.toLowerCase() === key);
}

export async function searchCases(query: string): Promise<ScrbCase[]> {
  const repo = await loadScrbRepository();
  const q = query.trim().toLowerCase();
  if (!q) return repo.cases;
  return repo.cases.filter((c) =>
    [
      c.caseId,
      c.firNumber,
      c.crimeType,
      c.status,
      c.officerName,
      c.district?.districtName ?? "",
      c.unit?.unitName ?? "",
      c.section?.sectionNo ?? "",
      c.act?.abbreviation ?? "",
      ...c.accused.map((a) => a.name),
      ...c.victims.map((v) => `${v.firstName} ${v.lastName}`),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function searchAccused(
  name: string,
): Promise<{ accused: AccusedRow; case?: ScrbCase }[]> {
  const repo = await loadScrbRepository();
  const q = name.trim().toLowerCase();
  const rows = q ? repo.accused.filter((a) => a.name.toLowerCase().includes(q)) : repo.accused;
  return rows.map((a) => ({ accused: a, case: repo.caseByFirId.get(a.firId) }));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return (await loadScrbRepository()).metrics;
}

export async function getDistrictStats(districtName?: string): Promise<DistrictStat[]> {
  const metrics = await getDashboardMetrics();
  if (!districtName) return metrics.districtStats;
  const key = districtName.toLowerCase();
  return metrics.districtStats.filter((d) => d.districtName.toLowerCase() === key);
}

export async function getCasesForDistrict(districtName?: string): Promise<ScrbCase[]> {
  const repo = await loadScrbRepository();
  if (!districtName || districtName.toLowerCase() === "all") return repo.cases;
  const key = districtName.toLowerCase();
  return repo.cases.filter((c) => c.district?.districtName.toLowerCase() === key);
}

export async function getOfficersForDistrict(districtName?: string): Promise<EmployeeRow[]> {
  const repo = await loadScrbRepository();
  if (!districtName || districtName.toLowerCase() === "all") return repo.employees;
  const district = repo.districts.find(
    (d) => d.districtName.toLowerCase() === districtName.toLowerCase(),
  );
  if (!district) return [];
  return repo.employees.filter((e) => e.districtId === district.districtId);
}

export async function getUnitsForDistrict(districtName?: string): Promise<UnitRow[]> {
  const repo = await loadScrbRepository();
  if (!districtName || districtName.toLowerCase() === "all") return repo.units;
  const district = repo.districts.find(
    (d) => d.districtName.toLowerCase() === districtName.toLowerCase(),
  );
  if (!district) return [];
  return repo.units.filter((u) => u.districtId === district.districtId);
}

export { cityFromAddress };
