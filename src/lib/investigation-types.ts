/** Shared API contract types for the Investigator workspace (client-safe). */

export interface CaseSummaryRow {
  caseId: string;
  firNumber: string;
  crimeType: string;
  station: string;
  status: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  registeredAt: string;
}

export interface CaseStatistics {
  evidence: number;
  witnesses: number;
  accused: number;
  victims: number;
  vehicles: number;
  phones: number;
  bankAccounts: number;
  digitalEvidence: number;
}

export interface CaseDetail extends CaseSummaryRow {
  officer: string;
  officerId: string;
  location: string;
  sections: string[];
  statistics: CaseStatistics;
  progress: { stage: string; state: "done" | "active" | "pending"; at?: string }[];
}

export interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  actor: string;
  tone: "info" | "success" | "warning" | "critical";
}

export interface Suggestion {
  id: string;
  title: string;
  detail: string;
  tone: "info" | "warning" | "critical";
  action: string;
}

export interface CaseSummaryDoc {
  caseId: string;
  generatedAt: string;
  headline: string;
  paragraphs: string[];
  confidence: number;
}

export interface CinGraph {
  caseId: string;
  nodes: { id: string; label: string; type: string; risk: number }[];
  edges: { from: string; to: string; type: string; weight: number }[];
  relationshipTypes: string[];
}

export interface BipProfile {
  caseId: string;
  subject: string;
  behaviourSummary: string;
  riskScore: number;
  repeatOffenderProbability: number;
  knownMo: string[];
  crimeFrequency: { label: string; value: number }[];
  psychologicalIndicators: { label: string; value: number }[];
  priorityLevel: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  officer: string;
  caseId: string;
  summary: string;
  reports: string[];
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  evidence: { id: string; label: string; detail: string }[];
  reasoning: { step: string; detail: string; confidence: number }[];
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  suggestedActions: { id: string; label: string }[];
  references: { id: string; label: string; source: string }[];
  nextSteps: string[];
}
