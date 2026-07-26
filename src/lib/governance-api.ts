import { queryOptions } from "@tanstack/react-query";
import type {
  GovernanceDashboard,
  GovernanceFilters,
  GovernanceQueryResult,
  PolicyImpactPayload,
  PolicySimulationInput,
  PolicySimulationResult,
  ResourcePlanning,
  StrategicIntelligence,
} from "./governance-types";
import type { ReportRecord } from "./intelligence-types";

/** Transport only. No governance analytics live in the frontend. */

export class GovRuntimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new GovRuntimeError("Unable to retrieve statewide intelligence.", 0);
  }
  if (!response.ok) {
    throw new GovRuntimeError("Unable to retrieve statewide intelligence.", response.status);
  }
  return (await response.json()) as T;
}

export function govParams(filters: GovernanceFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const governanceDashboardQuery = (filters: GovernanceFilters) =>
  queryOptions({
    queryKey: ["gov", "dashboard", filters],
    queryFn: () =>
      request<{ dashboard: GovernanceDashboard | null }>(
        `/api/governance/dashboard${govParams(filters)}`,
      ).then((r) => r.dashboard),
  });

export const strategicIntelligenceQuery = (filters: GovernanceFilters) =>
  queryOptions({
    queryKey: ["gov", "strategy", filters],
    queryFn: () =>
      request<{ strategy: StrategicIntelligence | null }>(
        `/api/governance/strategy${govParams(filters)}`,
      ).then((r) => r.strategy),
  });

export const policyImpactQuery = (filters: GovernanceFilters) =>
  queryOptions({
    queryKey: ["gov", "impact", filters],
    queryFn: () =>
      request<{ impact: PolicyImpactPayload | null }>(
        `/api/policy-impact${govParams(filters)}`,
      ).then((r) => r.impact),
  });

export const resourcePlanningQuery = (filters: GovernanceFilters) =>
  queryOptions({
    queryKey: ["gov", "resources", filters],
    queryFn: () =>
      request<{ resources: ResourcePlanning | null }>(
        `/api/resource-planning${govParams(filters)}`,
      ).then((r) => r.resources),
  });

export const executiveReportsQuery = (filters: GovernanceFilters) =>
  queryOptions({
    queryKey: ["gov", "reports", filters],
    queryFn: () =>
      request<{ reports: ReportRecord[]; policies: string[] }>(
        `/api/reports${govParams(filters)}`,
      ),
  });

export function runPolicySimulation(input: PolicySimulationInput) {
  return request<PolicySimulationResult>("/api/policy-simulation", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function sendGovernanceQuery(input: {
  role: string;
  filters: GovernanceFilters;
  query: string;
}) {
  return request<GovernanceQueryResult>("/api/governance/query", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
