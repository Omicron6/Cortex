import { useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import type { GovernanceFilters } from "./governance-types";

/** URL-backed governance scope shared by every policymaker route. */
export const governanceSearchSchema = z.object({
  fy: z.string().optional(),
  district: z.string().optional(),
  category: z.string().optional(),
  segment: z.string().optional(),
});

export type GovernanceSearch = z.infer<typeof governanceSearchSchema>;

export function useGovernanceScope() {
  const search = useSearch({ from: "/policymaker" });
  const navigate = useNavigate();
  const filters: GovernanceFilters = search;

  const setFilter = (key: keyof GovernanceSearch, value: string | undefined) =>
    navigate({
      to: ".",
      search: ((prev: GovernanceSearch) => ({ ...prev, [key]: value || undefined })) as never,
      replace: true,
    });

  const reset = () => navigate({ to: ".", search: {}, replace: true });

  const activeCount = Object.values(search).filter(Boolean).length;

  return { filters, search, setFilter, reset, activeCount };
}
