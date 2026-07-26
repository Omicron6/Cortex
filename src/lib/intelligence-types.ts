/** Shared API contract types for the Crime Analyst workspace (client-safe). */

export type VizKind =
  | "timeseries"
  | "bar"
  | "pie"
  | "heatmap"
  | "comparison"
  | "trendline"
  | "matrix";

export interface VizPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface Visualization {
  id: string;
  kind: VizKind;
  title: string;
  note?: string;
  unit?: string;
  points: VizPoint[];
  /** Correlation matrices only. */
  matrix?: { rows: string[]; cols: string[]; values: number[][] };
  /** Comparison charts only — legend for value / secondary. */
  legend?: [string, string];
}

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "warning" | "critical" | "gold";
}

export interface Hotspot {
  id: string;
  name: string;
  district: string;
  crimeType: string;
  incidents: number;
  intensity: number;
  trend: "rising" | "falling" | "stable";
}

export interface RiskLevel {
  district: string;
  score: number;
  band: "severe" | "elevated" | "moderate" | "low";
}

export interface Cluster {
  id: string;
  label: string;
  district: string;
  crimeType: string;
  size: number;
  confidence: number;
}

export interface Threat {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning" | "critical";
  district: string;
}

export interface Recommendation {
  id: string;
  action: string;
  rationale: string;
  priority: "Immediate" | "High" | "Routine";
  district: string;
}

export interface IntelEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: "info" | "success" | "warning" | "critical";
}

export interface IntelligenceDashboard {
  scopeLabel: string;
  generatedAt: string;
  recordsAnalysed: number;
  kpis: Kpi[];
  charts: Visualization[];
  hotspots: Hotspot[];
  riskLevels: RiskLevel[];
  clusters: Cluster[];
  threats: Threat[];
  activeCrimeTypes: { label: string; value: number }[];
  organizedCrimeAlerts: Threat[];
  repeatOffenderGrowth: { label: string; value: number }[];
  recommendations: Recommendation[];
  timeline: IntelEvent[];
}

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  risk: number;
  cluster: string;
  detail: string;
}

export interface NetworkEdge {
  from: string;
  to: string;
  type: string;
  weight: number;
  confidence: number;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: { id: string; label: string; risk: number; members: number; districts: string[] }[];
  relationshipTypes: string[];
}

export interface SocialIntelligence {
  disclaimer: string;
  distributions: Visualization[];
  indicators: { label: string; value: string; note: string }[];
  correlations: Visualization;
}

export interface Prediction {
  id: string;
  district: string;
  crimeType: string;
  window: string;
  likelihood: number;
  confidence: number;
  supportingTrends: string[];
  historicalEvidence: string[];
}

export interface PredictionPayload {
  predictions: Prediction[];
  hotspots: Hotspot[];
  riskZones: RiskLevel[];
  seasonal: Visualization;
  forecast: Visualization;
  growth: Visualization;
  timeline: IntelEvent[];
}

export interface ReportRecord {
  id: string;
  title: string;
  kind: string;
  scope: string;
  period: string;
  pages: number;
  generatedAt: string;
  classification: string;
  sections: string[];
  summary: string;
}

export interface IntelligenceQueryResult {
  queryId: string;
  question: string;
  generatedAt: string;
  executiveSummary: string;
  patterns: { label: string; detail: string }[];
  evidence: { id: string; label: string; detail: string }[];
  affectedDistricts: { district: string; incidents: number; change: string }[];
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  charts: Visualization[];
  graph?: NetworkGraph;
  recommendations: Recommendation[];
}

export interface IntelligenceFilters {
  district?: string;
  station?: string;
  category?: string;
  head?: string;
  subHead?: string;
  from?: string;
  to?: string;
  officer?: string;
  status?: string;
  stage?: string;
  severity?: string;
  tags?: string[];
  quick?: string;
}
