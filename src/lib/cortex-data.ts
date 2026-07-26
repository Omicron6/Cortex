export type RoleId = "investigator" | "analyst" | "supervisor" | "policymaker";

export interface Workspace {
  id: RoleId;
  role: string;
  engine: string;
  purpose: string;
  code: string;
  nav: { label: string; hint: string }[];
}

export const WORKSPACES: Workspace[] = [
  {
    id: "investigator",
    role: "Investigator",
    engine: "Adaptive Investigation Copilot",
    purpose: "Solve criminal investigations faster.",
    code: "WS-01",
    nav: [
      { label: "Case Board", hint: "Active FIR queue" },
      { label: "Investigation Copilot", hint: "AI reasoning" },
      { label: "Link Analysis", hint: "Knowledge graph" },
      { label: "Suspect Profiles", hint: "Person entities" },
      { label: "Evidence Vault", hint: "Stratus storage" },
      { label: "Field Timeline", hint: "Event sequence" },
    ],
  },
  {
    id: "analyst",
    role: "Crime Analyst",
    engine: "Adaptive Crime Intelligence Engine",
    purpose: "Transform crime records into intelligence.",
    code: "WS-02",
    nav: [
      { label: "Intelligence Desk", hint: "Signal review" },
      { label: "Hotspot Model", hint: "Spatial ML" },
      { label: "Pattern Discovery", hint: "Modus operandi" },
      { label: "Trend Forecasts", hint: "QuickML runtime" },
      { label: "Network Graph", hint: "Entity clusters" },
      { label: "Report Builder", hint: "SmartBrowz" },
    ],
  },
  {
    id: "supervisor",
    role: "Supervisor",
    engine: "Adaptive Decision Intelligence Engine",
    purpose: "Transform intelligence into operational decisions.",
    code: "WS-03",
    nav: [
      { label: "Command Overview", hint: "District posture" },
      { label: "Unit Readiness", hint: "Deployment state" },
      { label: "Case Velocity", hint: "Disposal metrics" },
      { label: "Order Console", hint: "Directives" },
      { label: "Escalations", hint: "Risk queue" },
      { label: "Accountability", hint: "Officer load" },
    ],
  },
  {
    id: "policymaker",
    role: "Policymaker",
    engine: "Adaptive Governance Intelligence Engine",
    purpose: "Strategic governance and long-term policing.",
    code: "WS-04",
    nav: [
      { label: "State Posture", hint: "Karnataka view" },
      { label: "Crime Economics", hint: "Cost modelling" },
      { label: "Policy Simulator", hint: "Scenario runs" },
      { label: "Resource Allocation", hint: "Budget signal" },
      { label: "Legislative Impact", hint: "Act-level view" },
      { label: "Public Trust Index", hint: "Sentiment" },
    ],
  },
];

export function getWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

export const TICKER_ITEMS = [
  { level: "info", text: "FIR/BLR/2026/04471 registered — Cubbon Park PS — Theft (IPC 379)" },
  { level: "critical", text: "Crime alert — Chain snatching cluster detected, Indiranagar corridor" },
  { level: "warning", text: "High risk offender KA-OFF-88213 flagged near Yeshwanthpur" },
  { level: "info", text: "Threat intelligence updated — 4 new vehicle-phone linkages" },
  { level: "success", text: "Supervisor order SUP-ORD-2291 issued — Night patrol reinforcement" },
  { level: "warning", text: "Hotspot alert — Mysuru Zone 3 exceeds 30-day burglary baseline" },
  { level: "info", text: "SCRB sync complete — 12,483 records ingested in last cycle" },
  { level: "critical", text: "Repeat offender network expanded — 7 new edges in KG-CLUSTER-42" },
];

export const ARCHITECTURE_LAYERS = [
  { id: "L0", title: "1100+ Police Stations", detail: "Statewide FIR origination points" },
  { id: "L1", title: "SCRB Repository", detail: "CCTNS structured crime records" },
  { id: "L2", title: "CORTEX Intelligence Layer", detail: "Normalization, enrichment, entity resolution" },
  { id: "L3", title: "Crime Knowledge Graph", detail: "Persons, FIRs, vehicles, phones, places" },
  { id: "L4", title: "Crime Intelligence Runtime", detail: "Reasoning, retrieval, ML inference" },
  { id: "L5", title: "Role-Aware AI Personas", detail: "Context-bound operational agents" },
  { id: "L6", title: "Four Operational Workspaces", detail: "Investigator · Analyst · Supervisor · Policymaker" },
];

export const CATALYST_SERVICES = [
  { name: "Catalyst QuickML", role: "AI Runtime", detail: "Trains and serves risk, hotspot and linkage models." },
  { name: "Catalyst Data Store", role: "Operational Database", detail: "Relational store for cases, entities and audit trails." },
  { name: "Catalyst Circuits", role: "Agent Orchestration", detail: "Sequences multi-step reasoning across personas." },
  { name: "Catalyst Authentication", role: "Secure Access", detail: "Role-bound identity and device-level trust." },
  { name: "Catalyst SmartBrowz", role: "Investigation Reports", detail: "Generates court-ready intelligence documents." },
  { name: "Catalyst Zia", role: "Speech + OCR", detail: "Voice interrogation and scanned FIR extraction." },
  { name: "Catalyst NoSQL", role: "Knowledge Graph Memory", detail: "Persists graph edges and reasoning memory." },
  { name: "Catalyst Stratus", role: "Evidence Storage", detail: "Chain-of-custody object storage for evidence." },
];

export const ENTITY_NODES = [
  "Persons",
  "FIRs",
  "Vehicles",
  "Phones",
  "Police Stations",
  "Districts",
  "Evidence",
  "Cases",
];

export interface MetricTile {
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "warning" | "critical";
}

export interface WorkspaceContent {
  metrics: MetricTile[];
  reasoning: { step: string; detail: string; confidence: string }[];
  table: {
    title: string;
    columns: string[];
    rows: string[][];
  };
  queue: { id: string; label: string; state: string; tone: "success" | "warning" | "critical" }[];
  trend: { label: string; value: number }[];
}

export const WORKSPACE_CONTENT: Record<RoleId, WorkspaceContent> = {
  investigator: {
    metrics: [
      { label: "Assigned Cases", value: "27", delta: "+3 today", tone: "primary" },
      { label: "AI Leads Generated", value: "148", delta: "+19 / 24h", tone: "success" },
      { label: "Pending Forensics", value: "06", delta: "2 overdue", tone: "warning" },
      { label: "Critical Cases", value: "03", delta: "escalated", tone: "critical" },
    ],
    reasoning: [
      { step: "Entity resolution", detail: "Suspect KA-P-4471 matched across 3 FIRs via phone 9xxxx-41082", confidence: "0.94" },
      { step: "Graph traversal", detail: "Vehicle KA-05-MH-8821 co-occurs with suspect in 2 hotspot cells", confidence: "0.88" },
      { step: "MO similarity", detail: "Method matches cluster KG-CLUSTER-42 (chain snatching, two-wheeler)", confidence: "0.81" },
      { step: "Recommendation", detail: "Prioritise CDR pull for 9xxxx-41082 between 19:00–23:00 window", confidence: "0.90" },
    ],
    table: {
      title: "Active FIR Queue",
      columns: ["FIR ID", "Section", "Station", "Risk", "Age"],
      rows: [
        ["FIR/BLR/2026/04471", "IPC 379", "Cubbon Park", "0.82", "2d"],
        ["FIR/BLR/2026/04466", "IPC 392", "Indiranagar", "0.91", "3d"],
        ["FIR/BLR/2026/04452", "IPC 420", "Whitefield", "0.44", "6d"],
        ["FIR/BLR/2026/04438", "IPC 457", "Jayanagar", "0.67", "9d"],
        ["FIR/BLR/2026/04419", "IPC 279", "Yelahanka", "0.28", "12d"],
      ],
    },
    queue: [
      { id: "EV-2201", label: "CCTV frame set — Indiranagar 12th Main", state: "Verified", tone: "success" },
      { id: "EV-2207", label: "CDR extract — 9xxxx-41082", state: "Awaiting order", tone: "warning" },
      { id: "EV-2211", label: "Seized two-wheeler — KA-05-MH-8821", state: "Chain break", tone: "critical" },
    ],
    trend: [
      { label: "W1", value: 38 },
      { label: "W2", value: 46 },
      { label: "W3", value: 41 },
      { label: "W4", value: 58 },
      { label: "W5", value: 52 },
      { label: "W6", value: 67 },
    ],
  },
  analyst: {
    metrics: [
      { label: "Records Processed", value: "12,483", delta: "last cycle", tone: "primary" },
      { label: "Active Hotspots", value: "14", delta: "+2 / week", tone: "warning" },
      { label: "Pattern Clusters", value: "37", delta: "+5 new", tone: "success" },
      { label: "Anomaly Signals", value: "09", delta: "review now", tone: "critical" },
    ],
    reasoning: [
      { step: "Spatial clustering", detail: "DBSCAN identifies 3 emergent cells in East Bengaluru", confidence: "0.92" },
      { step: "Temporal model", detail: "Offence peak shifting 21:00 → 22:30 over 6 weeks", confidence: "0.85" },
      { step: "Linkage inference", detail: "11 FIRs share vehicle-class + entry method signature", confidence: "0.79" },
      { step: "Forecast", detail: "Next 7 days: +18% burglary likelihood, Zone 3 Mysuru", confidence: "0.76" },
    ],
    table: {
      title: "Hotspot Ranking",
      columns: ["Cell", "District", "Offence", "Score", "Trend"],
      rows: [
        ["KA-CELL-3312", "Bengaluru East", "Snatching", "0.94", "▲ 22%"],
        ["KA-CELL-1180", "Mysuru", "Burglary", "0.88", "▲ 18%"],
        ["KA-CELL-2245", "Mangaluru", "Vehicle theft", "0.71", "▼ 04%"],
        ["KA-CELL-0917", "Hubballi", "Assault", "0.64", "▲ 09%"],
        ["KA-CELL-4402", "Belagavi", "Cyber fraud", "0.59", "▲ 31%"],
      ],
    },
    queue: [
      { id: "SIG-118", label: "Cyber fraud volume breach — Belagavi", state: "Confirmed", tone: "critical" },
      { id: "SIG-121", label: "Unusual FIR gap — Kalaburagi rural", state: "Investigating", tone: "warning" },
      { id: "SIG-126", label: "Cluster merge KG-42 + KG-58", state: "Validated", tone: "success" },
    ],
    trend: [
      { label: "Jan", value: 61 },
      { label: "Feb", value: 54 },
      { label: "Mar", value: 72 },
      { label: "Apr", value: 66 },
      { label: "May", value: 79 },
      { label: "Jun", value: 88 },
    ],
  },
  supervisor: {
    metrics: [
      { label: "Stations Reporting", value: "1,104", delta: "99.6% uptime", tone: "primary" },
      { label: "Case Disposal Rate", value: "72%", delta: "+4 pts", tone: "success" },
      { label: "Open Escalations", value: "18", delta: "5 ageing", tone: "warning" },
      { label: "Red Flags", value: "04", delta: "action due", tone: "critical" },
    ],
    reasoning: [
      { step: "Load balancing", detail: "Indiranagar PS at 138% of median caseload", confidence: "0.96" },
      { step: "Deployment gap", detail: "Night coverage deficit in 3 hotspot cells", confidence: "0.87" },
      { step: "Velocity risk", detail: "9 cases projected to breach 60-day mark", confidence: "0.83" },
      { step: "Directive", detail: "Recommend 2 additional patrol units, 20:00–02:00", confidence: "0.89" },
    ],
    table: {
      title: "District Command Posture",
      columns: ["District", "Open", "Disposed", "SLA", "Posture"],
      rows: [
        ["Bengaluru City", "3,412", "2,981", "78%", "Elevated"],
        ["Mysuru", "1,108", "902", "81%", "Watch"],
        ["Mangaluru", "742", "664", "89%", "Stable"],
        ["Hubballi-Dharwad", "688", "540", "74%", "Watch"],
        ["Kalaburagi", "512", "461", "91%", "Stable"],
      ],
    },
    queue: [
      { id: "ESC-441", label: "Custodial timeline breach risk — Whitefield", state: "Immediate", tone: "critical" },
      { id: "ESC-448", label: "Forensics backlog — Regional FSL", state: "Escalated", tone: "warning" },
      { id: "ESC-452", label: "Patrol reinforcement acknowledged", state: "Closed", tone: "success" },
    ],
    trend: [
      { label: "Q1", value: 58 },
      { label: "Q2", value: 63 },
      { label: "Q3", value: 69 },
      { label: "Q4", value: 72 },
      { label: "Q5", value: 76 },
      { label: "Q6", value: 81 },
    ],
  },
  policymaker: {
    metrics: [
      { label: "State Crime Index", value: "112.4", delta: "-2.8 YoY", tone: "success" },
      { label: "Districts Monitored", value: "31", delta: "full coverage", tone: "primary" },
      { label: "Policy Simulations", value: "12", delta: "3 pending", tone: "warning" },
      { label: "Critical Corridors", value: "05", delta: "review", tone: "critical" },
    ],
    reasoning: [
      { step: "Structural driver", detail: "Cyber fraud growth concentrated in tier-2 urban clusters", confidence: "0.90" },
      { step: "Resource elasticity", detail: "+10% cyber cell staffing → est. -13% case ageing", confidence: "0.78" },
      { step: "Legislative signal", detail: "IT Act filings up 31%, conviction lag 14 months", confidence: "0.84" },
      { step: "Recommendation", detail: "Fund 6 district cyber units in FY allocation cycle", confidence: "0.86" },
    ],
    table: {
      title: "Strategic Indicators",
      columns: ["Indicator", "Baseline", "Current", "Target", "Status"],
      rows: [
        ["Cognizable rate / 100k", "298", "271", "250", "On track"],
        ["Charge-sheet within 60d", "64%", "72%", "80%", "On track"],
        ["Cyber conviction rate", "21%", "24%", "40%", "Lagging"],
        ["Response time (urban)", "11.4m", "9.2m", "8m", "On track"],
        ["Public trust index", "68", "71", "78", "Watch"],
      ],
    },
    queue: [
      { id: "SIM-07", label: "Cyber unit expansion — 6 districts", state: "Recommended", tone: "success" },
      { id: "SIM-09", label: "Night patrol funding reallocation", state: "Under review", tone: "warning" },
      { id: "SIM-11", label: "Corridor surveillance mandate", state: "Blocked", tone: "critical" },
    ],
    trend: [
      { label: "2021", value: 88 },
      { label: "2022", value: 82 },
      { label: "2023", value: 79 },
      { label: "2024", value: 74 },
      { label: "2025", value: 70 },
      { label: "2026", value: 66 },
    ],
  },
};

export const INIT_MESSAGES = [
  "Initializing Crime Intelligence Runtime...",
  "Loading Knowledge Graph...",
  "Connecting SCRB Repository...",
  "Synchronizing Intelligence Layer...",
  "Loading Role Context...",
  "Workspace Ready.",
];
