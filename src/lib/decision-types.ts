/** Shared API contract types for the Supervisor / ADIE workspace (client-safe). */

export type RiskBand = "severe" | "elevated" | "moderate" | "low";
export type Tone = "info" | "success" | "warning" | "critical";

export interface UnitReadiness {
  label: string;
  ready: number;
  total: number;
  status: "Ready" | "Committed" | "Standby" | "Depleted";
}

export interface MajorEvent {
  id: string;
  name: string;
  at: string;
  venue: string;
  expectedCrowd: number;
}

export interface TrafficAlert {
  id: string;
  text: string;
  severity: Tone;
}

export interface DistrictOverview {
  district: string;
  generatedAt: string;
  threatLevel: { label: string; band: RiskBand; score: number };
  personnel: { available: number; total: number; onLeave: number };
  stations: number;
  activeInvestigations: number;
  pendingCases: number;
  crimeTrend: { direction: "rising" | "falling" | "stable"; delta: string; window: string };
  emergencyIncidents: number;
  weather: { summary: string; temperature: string; advisory: string };
  majorEvents: MajorEvent[];
  trafficAlerts: TrafficAlert[];
  units: UnitReadiness[];
}

export interface MapFeature {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  intensity?: number;
  path?: { x: number; y: number }[];
}

export type MapLayerKind =
  | "station"
  | "hotspot"
  | "patrol"
  | "incident"
  | "sensitive"
  | "closure"
  | "deployment"
  | "infrastructure";

export interface MapLayer {
  id: string;
  label: string;
  kind: MapLayerKind;
  features: MapFeature[];
}

export interface DeploymentPlan {
  personnel: { role: string; count: number; source: string }[];
  stations: { id: string; name: string; contribution: number; commander: string }[];
  reserveUnits: string[];
  trafficDiversions: string[];
  rapidResponseTeams: { id: string; label: string; stagingPoint: string; strength: number }[];
  surveillanceCoverage: string[];
  droneDeployment: string[];
  checkpoints: { id: string; location: string; window: string; strength: number }[];
  medicalSupport: string[];
  communicationUnits: string[];
}

export interface EvidenceItem {
  id: string;
  label: string;
  detail: string;
}

export interface OperationalRecommendation {
  id: string;
  action: string;
  reason: string;
  confidence: number;
  supportingIntelligence: string[];
  evidence: EvidenceItem[];
  priority: "Immediate" | "High" | "Routine";
}

export interface HistoricalEvent {
  id: string;
  name: string;
  date: string;
  crowd: number;
  outcome: string;
  lesson: string;
}

export interface DecisionBrief {
  briefId: string;
  district: string;
  scenario: string;
  generatedAt: string;
  executiveSummary: string;
  threatAssessment: { band: RiskBand; score: number; summary: string; factors: string[] };
  historicalSimilarEvents: HistoricalEvent[];
  crimeIntelligence: { label: string; detail: string }[];
  resourceAvailability: { label: string; value: string; note: string }[];
  deploymentPlan: DeploymentPlan;
  patrolRecommendations: string[];
  sensitiveLocations: { id: string; name: string; reason: string; band: RiskBand }[];
  emergencyResponsePlan: string[];
  communicationStrategy: string[];
  riskLevel: { band: RiskBand; score: number };
  confidence: number;
  evidence: EvidenceItem[];
  recommendations: OperationalRecommendation[];
  mapLayers: MapLayer[];
  timeline: OperationalEvent[];
}

export interface OperationalEvent {
  id: string;
  at: string;
  kind: "Order" | "Threat Update" | "Deployment" | "Emergency Alert" | "Supervisor Decision";
  title: string;
  detail: string;
  tone: Tone;
}

export interface ThreatItem {
  id: string;
  title: string;
  detail: string;
  category:
    | "Hotspot"
    | "Emerging"
    | "Gang"
    | "Communal"
    | "Cyber"
    | "Financial"
    | "Repeat Offender"
    | "Infrastructure";
  district: string;
  band: RiskBand;
  updatedAt: string;
  confidence: number;
}

export interface ThreatPayload {
  district: string;
  generatedAt: string;
  threats: ThreatItem[];
  riskLevels: { district: string; score: number; band: RiskBand }[];
  mapLayers: MapLayer[];
}

export interface DeploymentPayload {
  district: string;
  generatedAt: string;
  scenarioLabel: string;
  plan: DeploymentPlan;
  personnelSummary: { label: string; value: string }[];
  mapLayers: MapLayer[];
}

export interface DraftDirective {
  id: string;
  title: string;
  body: string;
  target: string;
  priority: "Immediate" | "High" | "Routine";
  basis: string[];
  status: "Draft" | "Approved" | "Issued";
  createdAt: string;
}

export interface OrdersPayload {
  district: string;
  drafts: DraftDirective[];
  log: OperationalEvent[];
}

export interface IssuedOrder {
  orderId: string;
  status: "Issued";
  approvalStatus: "Approved by Supervisor";
  timestamp: string;
  title: string;
  target: string;
}

export interface StationPerformance {
  id: string;
  name: string;
  disposalRate: number;
  pending: number;
  responseMinutes: number;
  patrolCoverage: number;
  band: RiskBand;
}

export interface DistrictOperations {
  district: string;
  generatedAt: string;
  crimeTrend: { label: string; value: number }[];
  pendingInvestigations: { label: string; value: number }[];
  officerWorkload: { label: string; value: number }[];
  resourceUtilisation: { label: string; value: number }[];
  responseTimes: { label: string; value: number }[];
  patrolCoverage: { label: string; value: number }[];
  stations: StationPerformance[];
  emergencyIncidents: OperationalEvent[];
  riskScore: { score: number; band: RiskBand; note: string };
}

export interface DecisionScope {
  district?: string;
  template?: string;
}
