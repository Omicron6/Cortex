import { queryOptions } from "@tanstack/react-query";
import type {
  DecisionBrief,
  DeploymentPayload,
  DistrictOperations,
  DistrictOverview,
  IssuedOrder,
  OrdersPayload,
  ThreatPayload,
} from "./decision-types";

/**
 * Thin transport layer for the Decision Intelligence Runtime.
 * No operational reasoning lives here — only request/response plumbing.
 */

export class DecisionRuntimeError extends Error {
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
    throw new DecisionRuntimeError("Unable to retrieve operational intelligence.", 0);
  }
  if (!response.ok) {
    throw new DecisionRuntimeError("Unable to retrieve operational intelligence.", response.status);
  }
  return (await response.json()) as T;
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && search.set(k, v));
  const q = search.toString();
  return q ? `?${q}` : "";
}

export const districtOverviewQuery = (district?: string) =>
  queryOptions({
    queryKey: ["adie", "overview", district ?? "default"],
    queryFn: () => request<DistrictOverview>(`/api/district/overview${qs({ district })}`),
  });

export const threatsQuery = (district?: string) =>
  queryOptions({
    queryKey: ["adie", "threats", district ?? "default"],
    queryFn: () => request<ThreatPayload>(`/api/threats${qs({ district })}`),
    refetchInterval: 30_000,
  });

export const deploymentQuery = (district?: string, template?: string) =>
  queryOptions({
    queryKey: ["adie", "deployment", district ?? "default", template ?? ""],
    queryFn: () => request<DeploymentPayload>(`/api/deployment${qs({ district, template })}`),
  });

export const ordersQuery = (district?: string) =>
  queryOptions({
    queryKey: ["adie", "orders", district ?? "default"],
    queryFn: () => request<OrdersPayload>(`/api/orders${qs({ district })}`),
  });

export const operationsQuery = (district?: string) =>
  queryOptions({
    queryKey: ["adie", "operations", district ?? "default"],
    queryFn: () => request<DistrictOperations>(`/api/district/operations${qs({ district })}`),
  });

export function sendScenario(input: {
  district?: string;
  scenario: string;
  role: string;
  additionalContext?: string;
}) {
  return request<DecisionBrief>("/api/decision/scenario", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function issueDirective(input: { orderId: string; title: string; target: string }) {
  return request<IssuedOrder>("/api/orders", { method: "POST", body: JSON.stringify(input) });
}
