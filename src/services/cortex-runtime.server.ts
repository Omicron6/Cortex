/**
 * CORTEX Serverless Runtime client (Zoho Catalyst).
 *
 * Wraps the QuickML RAG (Qwen 3.6 35B) + VLM endpoints exposed by the
 * Catalyst serverless backend. The endpoint is open (auth handled
 * server-side by Catalyst), so we only need a plain fetch from our server.
 *
 * Every call is best-effort: if the runtime is unreachable, slow, or returns
 * a malformed payload we return `null` and the caller falls back to the
 * deterministic SCRB-derived intelligence layer.
 */

const DEFAULT_BASE_URL =
  "https://cortex-60080078691.development.catalystserverless.in/server/cortex_runtime";

const TIMEOUT_MS = 20_000;
const PATTERN_TIMEOUT_MS = 15_000;

export type CortexPersona = "AIC" | "ACIE" | "ADIE" | "AGIE";

export interface CortexChatRequest {
  persona: CortexPersona;
  question: string;
  district?: string;
  /** Base64 strings, max 3 images per request (VLM limit). */
  images?: string[];
}

export interface CortexChatResponse {
  answer: string;
  evidence: string[];
  confidence: string;
  confidenceScore: number;
  reasoning: string;
  sources: string[];
  persona: { key: string; name: string } | null;
  generatedAt: string;
}

export interface CortexPatternResponse {
  district: string;
  topCrimeHeads: { label: string; value: number }[];
  forecast: { label: string; value: number }[];
  raw: unknown;
}

export interface CortexReportResponse {
  persona: CortexPersona;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  recommendations: string[];
  generatedAt: string;
  raw: unknown;
}


function baseUrl(): string {
  const configured = process.env.CORTEX_RUNTIME_URL?.trim();
  return (configured && configured.length > 0 ? configured : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function confidenceToScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1 ? Math.min(1, value / 100) : Math.max(0, value);
  }
  const label = String(value ?? "").toLowerCase();
  if (label.startsWith("high")) return 0.9;
  if (label.startsWith("med")) return 0.72;
  if (label.startsWith("low")) return 0.55;
  return 0.7;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[cortex-runtime] ${path} responded ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`[cortex-runtime] ${path} unreachable:`, (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Calls POST /chat. Returns null when the runtime is unavailable. */
export async function askCortex(input: CortexChatRequest): Promise<CortexChatResponse | null> {
  const payload: Record<string, unknown> = {
    persona: input.persona,
    question: input.question,
  };
  if (input.district) payload.district = input.district;
  if (input.images?.length) payload.images = input.images.slice(0, 3);

  const data = (await postJson("/chat", payload, TIMEOUT_MS)) as Record<string, unknown> | null;
  if (!data) return null;

  const answer = typeof data.answer === "string" ? data.answer.trim() : "";
  if (!answer) return null;

  const personaRaw = data.persona as { key?: unknown; name?: unknown } | undefined;
  const metadata = data.metadata as { generatedAt?: unknown } | undefined;

  return {
    answer,
    evidence: toStringArray(data.evidence),
    confidence: String(data.confidence ?? "Medium"),
    confidenceScore: confidenceToScore(data.confidence),
    reasoning: typeof data.reasoning === "string" ? data.reasoning : "Retrieved from Knowledge Base",
    sources: toStringArray(data.sources),
    persona: personaRaw
      ? { key: String(personaRaw.key ?? input.persona), name: String(personaRaw.name ?? "") }
      : null,
    generatedAt:
      typeof metadata?.generatedAt === "string" ? metadata.generatedAt : new Date().toISOString(),
  };
}

/** Calls GET /pattern?district=... for QuickML numeric forecasts. */
export async function fetchCortexPattern(
  district?: string,
): Promise<CortexPatternResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PATTERN_TIMEOUT_MS);
  try {
    const url = new URL(`${baseUrl()}/pattern`);
    if (district) url.searchParams.set("district", district);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[cortex-runtime] /pattern responded ${response.status}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;

    const readPoints = (value: unknown): { label: string; value: number }[] => {
      if (Array.isArray(value)) {
        return value
          .map((entry) => {
            if (Array.isArray(entry) && entry.length >= 2) {
              return { label: String(entry[0]), value: Number(entry[1]) || 0 };
            }
            const row = entry as Record<string, unknown>;
            const label =
              row?.label ?? row?.name ?? row?.crimeHead ?? row?.crime_head ?? row?.month ?? row?.period;
            const val = row?.value ?? row?.count ?? row?.forecast ?? row?.prediction;
            if (label === undefined) return null;
            return { label: String(label), value: Number(val) || 0 };
          })
          .filter((p): p is { label: string; value: number } => p !== null);
      }
      if (value && typeof value === "object") {
        const row = value as Record<string, unknown>;
        // Runtime returns { available: false, reason: "..." } when QuickML is unconfigured.
        if ("available" in row) {
          if (row.available !== true) return [];
          return readPoints(row.points ?? row.forecast ?? row.values);
        }
        return Object.entries(row)
          .filter(([, val]) => typeof val === "number" || typeof val === "string")
          .map(([label, val]) => ({ label, value: Number(val) || 0 }));
      }
      return [];
    };

    // Synthetic records from the runtime must never override real SCRB analytics.
    const dataSource = String(data.dataSource ?? data.data_source ?? "");
    if (dataSource === "demo-fallback") {
      console.info("[cortex-runtime] /pattern returned demo-fallback — using SCRB layer instead");
      return null;
    }

    return {
      district: String(data.district ?? district ?? "Karnataka"),
      topCrimeHeads: readPoints(data.topCrimeHeads ?? data.top_crime_heads ?? data.crimeHeads),
      forecast: readPoints(data.forecast ?? data.predictions ?? data.trend),
      raw: data,
    };
  } catch (error) {
    console.warn("[cortex-runtime] /pattern unreachable:", (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}


/**
 * Calls GET /report?persona=... for the pre-rendered executive / decision
 * report produced by the Catalyst runtime. Returns null when unavailable.
 */
export async function fetchCortexReport(
  persona: CortexPersona,
  district?: string,
): Promise<CortexReportResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(`${baseUrl()}/report`);
    url.searchParams.set("persona", persona);
    if (district) url.searchParams.set("district", district);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[cortex-runtime] /report responded ${response.status}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;

    // The runtime nests the analytic payload under `report`.
    const nested = (data.report ?? {}) as Record<string, unknown>;
    const dataSource = String(
      data.dataSource ?? nested.dataSource ?? nested.data_source ?? "",
    );
    if (dataSource === "demo-fallback") {
      console.info("[cortex-runtime] /report returned demo-fallback — using SCRB layer instead");
      return null;
    }

    const summary =
      typeof data.summary === "string"
        ? data.summary
        : typeof data.answer === "string"
          ? data.answer
          : "";
    if (!summary.trim()) return null;

    const sectionsRaw = data.sections;
    const sections = Array.isArray(sectionsRaw)
      ? sectionsRaw
          .map((entry) => {
            if (typeof entry === "string") return { heading: "", body: entry };
            const row = entry as Record<string, unknown>;
            return {
              heading: String(row?.heading ?? row?.title ?? ""),
              body: String(row?.body ?? row?.content ?? row?.text ?? ""),
            };
          })
          .filter((s) => s.body.trim().length > 0)
      : [];

    // `evidence` arrives as objects; fold it into a readable section when present.
    if (!sections.length && Array.isArray(data.evidence)) {
      const lines = (data.evidence as unknown[])
        .map((e) => {
          if (typeof e === "string") return e;
          const row = e as Record<string, unknown>;
          const ref = String(row?.reference ?? row?.type ?? "");
          const sum = String(row?.summary ?? "");
          return [ref, sum].filter(Boolean).join(" — ");
        })
        .filter(Boolean);
      if (lines.length) sections.push({ heading: "Evidence", body: lines.join("\n") });
    }
    if (typeof data.reasoning === "string" && data.reasoning.trim()) {
      sections.push({ heading: "Reasoning", body: data.reasoning.trim() });
    }

    const metadata = (data.metadata ?? nested) as { generatedAt?: unknown } | undefined;


    return {
      persona,
      title: String(data.title ?? `${persona} Report`),
      summary: summary.trim(),
      sections,
      recommendations: toStringArray(data.recommendations ?? data.actions),
      generatedAt:
        typeof metadata?.generatedAt === "string"
          ? metadata.generatedAt
          : typeof data.generatedAt === "string"
            ? data.generatedAt
            : new Date().toISOString(),
      raw: data,
    };
  } catch (error) {
    console.warn("[cortex-runtime] /report unreachable:", (error as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
