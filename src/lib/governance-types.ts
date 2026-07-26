/** Shared API contract types for the Policymaker workspace (client-safe). */
import type { Visualization } from "./intelligence-types";

export type Priority = "Immediate" | "High" | "Medium" | "Routine";
export type RiskBand = "severe" | "elevated" | "moderate" | "low";

export interface GovKpi {
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "warning" | "critical" | "gold";
}

export interface DistrictStat {
  district: string;
  crimes: number;
  clearance: number;
  conviction: number;
  growth: number;
  band: RiskBand;
}

export interface StateSummary {
  scopeLabel: string;
  financialYear: string;
  generatedAt: string;
  recordsAnalysed: number;
  totalCrimes: number;
  activeInvestigations: number;
  pendingCases: number;
  solvedCases: number;
  clearanceRate: number;
  officerStrength: number;
  riskDistribution: { band: RiskBand; districts: number }[];
  topCategories: { label: string; value: number }[];
  topDistricts: { district: string; clearance: number }[];
  highRiskDistricts: { district: string; score: number; band: RiskBand }[];
}

export interface StrategicInsight {
  id: string;
  title: string;
  category: string;
  detail: string;
  evidence: string[];
  historicalContext: string;
  confidence: number;
  direction: "rising" | "falling" | "stable";
}

export interface GovRecommendation {
  id: string;
  action: string;
  evidence: string;
  priority: Priority;
  expectedImpact: string;
  confidence: number;
  district: string;
}

export interface ExecutiveBrief {
  id: string;
  preparedFor: string;
  generatedAt: string;
  sections: { id: string; heading: string; body: string; bullets?: string[] }[];
  confidence: number;
}

export interface GovernanceDashboard {
  summary: StateSummary;
  kpis: GovKpi[];
  charts: Visualization[];
  districtStats: DistrictStat[];
  brief: ExecutiveBrief;
  recommendations: GovRecommendation[];
}

export interface StrategicIntelligence {
  insights: StrategicInsight[];
  rankings: DistrictStat[];
  charts: Visualization[];
  fiveYear: Visualization;
  seasonality: Visualization;
  repeatOffenders: { label: string; value: string; note: string }[];
  infrastructureGaps: { district: string; gap: string; severity: RiskBand }[];
}

export interface PolicyEvaluation {
  id: string;
  policy: string;
  period: string;
  district: string;
  before: number;
  after: number;
  changePct: number;
  kpis: { label: string; value: string; note: string }[];
  evidence: string[];
  confidence: number;
  trend: Visualization;
}

export interface PolicyImpactPayload {
  evaluations: PolicyEvaluation[];
  charts: Visualization[];
}

export interface ResourcePlanning {
  stats: GovKpi[];
  officerDistribution: Visualization;
  stationCoverage: Visualization;
  vehicleAllocation: Visualization;
  technologyAdoption: Visualization;
  forecast: Visualization;
  underserved: { district: string; gap: string; requirement: string; severity: RiskBand }[];
  capacity: { label: string; value: string; note: string }[];
  training: { label: string; value: string; note: string }[];
}

export interface PolicySimulationInput {
  policy: string;
  parameters: { magnitude: number; horizonMonths: number; district?: string };
}

export interface PolicySimulationResult {
  id: string;
  policy: string;
  generatedAt: string;
  projectedImpact: {
    crimeReductionPct: number;
    budgetImpactCr: number;
    officerRequirement: number;
    affectedDistricts: number;
    horizon: string;
  };
  confidence: number;
  supportingEvidence: string[];
  visualizations: Visualization[];
  advisory: string;
}

export interface GovernanceQueryResult {
  queryId: string;
  question: string;
  generatedAt: string;
  executiveSummary: string;
  recommendations: GovRecommendation[];
  charts: Visualization[];
  confidence: number;
  evidence: { id: string; label: string; detail: string }[];
}

export interface GovernanceFilters {
  fy?: string;
  district?: string;
  category?: string;
  segment?: string;
}
