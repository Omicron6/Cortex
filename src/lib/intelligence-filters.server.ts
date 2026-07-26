import { z } from "zod";
import type { IntelligenceFilters } from "./intelligence-types";

const str = z.string().max(80).optional();

const schema = z.object({
  district: str,
  station: str,
  category: str,
  head: str,
  subHead: str,
  from: str,
  to: str,
  officer: str,
  status: str,
  stage: str,
  severity: str,
  tags: z.string().max(300).optional(),
  quick: str,
});

/** Parses request query params into the runtime filter contract. */
export function parseFilters(request: Request): IntelligenceFilters {
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return {};
  const { tags, ...rest } = parsed.data;
  return { ...rest, tags: tags ? tags.split(",").filter(Boolean).slice(0, 12) : undefined };
}

export const filtersSchema = z.object({
  district: str,
  station: str,
  category: str,
  head: str,
  subHead: str,
  from: str,
  to: str,
  officer: str,
  status: str,
  stage: str,
  severity: str,
  tags: z.array(z.string().max(60)).max(12).optional(),
  quick: str,
});
