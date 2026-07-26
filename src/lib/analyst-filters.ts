import { useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import type { IntelligenceFilters } from "./intelligence-types";

/** URL-backed intelligence scope shared by every analyst route. */
export const analystSearchSchema = z.object({
  district: z.string().optional(),
  station: z.string().optional(),
  category: z.string().optional(),
  head: z.string().optional(),
  subHead: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  officer: z.string().optional(),
  status: z.string().optional(),
  stage: z.string().optional(),
  severity: z.string().optional(),
  tags: z.array(z.string()).optional(),
  quick: z.string().optional(),
});

export type AnalystSearch = z.infer<typeof analystSearchSchema>;

export function useAnalystScope() {
  const search = useSearch({ from: "/analyst" });
  const navigate = useNavigate();

  const filters: IntelligenceFilters = search;

  const setFilter = (key: keyof AnalystSearch, value: string | undefined) =>
    navigate({
      to: ".",
      search: ((prev: AnalystSearch) => ({ ...prev, [key]: value || undefined })) as never,
      replace: true,
    });

  const toggleTag = (tag: string) =>
    navigate({
      to: ".",
      search: ((prev: AnalystSearch) => {
        const current = prev.tags ?? [];
        const next = current.includes(tag)
          ? current.filter((t) => t !== tag)
          : [...current, tag].slice(0, 12);
        return { ...prev, tags: next.length ? next : undefined };
      }) as never,
      replace: true,
    });

  const reset = () => navigate({ to: ".", search: {}, replace: true });

  const activeCount =
    Object.entries(search).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))
      .length;

  return { filters, search, setFilter, toggleTag, reset, activeCount };
}
