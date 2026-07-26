import { useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import type { DecisionScope } from "./decision-types";

/** URL-backed operational scope shared by every supervisor route. */
export const supervisorSearchSchema = z.object({
  district: z.string().optional(),
  template: z.string().optional(),
});

export type SupervisorSearch = z.infer<typeof supervisorSearchSchema>;

export const DISTRICTS = [
  "Bengaluru City",
  "Bengaluru Rural",
  "Mysuru",
  "Mangaluru",
  "Belagavi",
  "Kalaburagi",
  "Hubballi-Dharwad",
  "Udupi",
] as const;

export const OPERATIONAL_TEMPLATES = [
  {
    id: "political-rally",
    label: "Political Rally",
    scenario:
      "A political rally is scheduled tomorrow with an expected crowd of 60,000 in the district headquarters.",
  },
  {
    id: "religious-gathering",
    label: "Religious Gathering",
    scenario:
      "A large religious gathering is expected this weekend with processions through the old city.",
  },
  { id: "vip-visit", label: "VIP Visit", scenario: "A Z-category VIP visit is scheduled in two days with three public engagements." },
  { id: "festival-security", label: "Festival Security", scenario: "Prepare festival security for the ten-day Dasara procession and night events." },
  { id: "election-duty", label: "Election Duty", scenario: "Assembly by-election polling is scheduled next week across 214 booths." },
  { id: "natural-disaster", label: "Natural Disaster", scenario: "A cyclone warning has been issued for the coastal belt with heavy rainfall forecast." },
  { id: "communal-tension", label: "Communal Tension", scenario: "There is increasing communal tension following a social media incident in the town centre." },
  { id: "student-protest", label: "Student Protest", scenario: "A student protest march is planned from the university campus to the district office." },
  { id: "missing-child", label: "Missing Child Alert", scenario: "A missing child alert has been raised; last seen near the central bus stand four hours ago." },
  { id: "cyber-attack", label: "Cyber Attack", scenario: "Cyber fraud has increased significantly with a coordinated attack on local cooperative banks." },
  { id: "public-event", label: "Large Public Event", scenario: "Prepare security for an IPL match at the city stadium with 40,000 ticketed spectators." },
] as const;

export function useSupervisorScope() {
  const search = useSearch({ from: "/supervisor" });
  const navigate = useNavigate();

  const scope: DecisionScope = search;
  const district = search.district ?? DISTRICTS[0];

  const setValue = (key: keyof SupervisorSearch, value: string | undefined) =>
    navigate({
      to: ".",
      search: ((prev: SupervisorSearch) => ({ ...prev, [key]: value || undefined })) as never,
      replace: true,
    });

  const reset = () => navigate({ to: ".", search: {}, replace: true });

  return { scope, search, district, setValue, reset };
}
