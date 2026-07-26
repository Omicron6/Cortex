import { queryOptions } from "@tanstack/react-query";
import type {
  BipProfile,
  CaseDetail,
  CaseSummaryDoc,
  CaseSummaryRow,
  ChatResponse,
  CinGraph,
  HistoryEntry,
  Suggestion,
  TimelineEvent,
} from "./investigation-types";

/**
 * Thin transport layer for the Crime Intelligence Runtime.
 * No investigation logic lives here — only request/response plumbing.
 */

export class RuntimeError extends Error {
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
    throw new RuntimeError("Unable to connect to Investigation Runtime.", 0);
  }
  if (!response.ok) {
    throw new RuntimeError(
      response.status === 404
        ? "Requested investigation record is unavailable."
        : "Investigation Runtime returned an error.",
      response.status,
    );
  }
  return (await response.json()) as T;
}

export const casesQuery = () =>
  queryOptions({
    queryKey: ["cases"],
    queryFn: () => request<{ cases: CaseSummaryRow[] }>("/api/cases").then((r) => r.cases),
  });

export const caseQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId],
    queryFn: () => request<CaseDetail>(`/api/case/${caseId}`),
    enabled: Boolean(caseId),
  });

export const timelineQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId, "timeline"],
    queryFn: () =>
      request<{ events: TimelineEvent[] }>(`/api/case/${caseId}/timeline`).then((r) => r.events),
    enabled: Boolean(caseId),
  });

export const suggestionsQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId, "suggestions"],
    queryFn: () =>
      request<{ suggestions: Suggestion[] }>(`/api/case/${caseId}/suggestions`).then(
        (r) => r.suggestions,
      ),
    enabled: Boolean(caseId),
  });

export const summaryQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId, "summary"],
    queryFn: () => request<CaseSummaryDoc>(`/api/case/${caseId}/summary`),
    enabled: Boolean(caseId),
  });

export const cinQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId, "cin"],
    queryFn: () => request<CinGraph>(`/api/case/${caseId}/cin`),
    enabled: Boolean(caseId),
  });

export const bipQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case", caseId, "bip"],
    queryFn: () => request<BipProfile>(`/api/case/${caseId}/bip`),
    enabled: Boolean(caseId),
  });

export const historyQuery = (caseId?: string) =>
  queryOptions({
    queryKey: ["history", caseId ?? "all"],
    queryFn: () =>
      request<{ entries: HistoryEntry[] }>(
        `/api/history${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`,
      ).then((r) => r.entries),
  });

export function sendChat(input: {
  caseId: string;
  role: string;
  message: string;
  conversationId?: string;
}) {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
