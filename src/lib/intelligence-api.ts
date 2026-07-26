import { queryOptions } from "@tanstack/react-query";
import type {
  IntelligenceDashboard,
  IntelligenceFilters,
  IntelligenceQueryResult,
  NetworkGraph,
  PredictionPayload,
  ReportRecord,
  SocialIntelligence,
} from "./intelligence-types";

/**
 * Thin transport layer for the statewide Crime Intelligence Runtime.
 * No analytics live here — only request/response plumbing.
 */

export class IntelRuntimeError extends Error {
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
    throw new IntelRuntimeError("Unable to retrieve intelligence.", 0);
  }
  if (!response.ok) {
    throw new IntelRuntimeError("Unable to retrieve intelligence.", response.status);
  }
  return (await response.json()) as T;
}

export function filterParams(filters: IntelligenceFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const dashboardQuery = (filters: IntelligenceFilters) =>
  queryOptions({
    queryKey: ["intel", "dashboard", filters],
    queryFn: () =>
      request<{ dashboard: IntelligenceDashboard | null }>(
        `/api/intelligence/dashboard${filterParams(filters)}`,
      ).then((r) => r.dashboard),
  });

export const networkQuery = (filters: IntelligenceFilters) =>
  queryOptions({
    queryKey: ["intel", "network", filters],
    queryFn: () => request<NetworkGraph>(`/api/network${filterParams(filters)}`),
  });

export const socialQuery = (filters: IntelligenceFilters) =>
  queryOptions({
    queryKey: ["intel", "social", filters],
    queryFn: () => request<SocialIntelligence>(`/api/intelligence/social${filterParams(filters)}`),
  });

export const predictionsQuery = (filters: IntelligenceFilters) =>
  queryOptions({
    queryKey: ["intel", "predictions", filters],
    queryFn: () => request<PredictionPayload>(`/api/predictions${filterParams(filters)}`),
  });

export const reportsQuery = (filters: IntelligenceFilters) =>
  queryOptions({
    queryKey: ["intel", "reports", filters],
    queryFn: () =>
      request<{ reports: ReportRecord[] }>(`/api/reports${filterParams(filters)}`).then(
        (r) => r.reports,
      ),
  });

export function sendIntelligenceQuery(input: {
  role: string;
  filters: IntelligenceFilters;
  message: string;
}) {
  return request<IntelligenceQueryResult>("/api/intelligence/query", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
