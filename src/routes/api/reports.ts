import { createFileRoute } from "@tanstack/react-router";
import { getReports } from "@/lib/intelligence-runtime.server";
import { parseFilters } from "@/lib/intelligence-filters.server";
import { listPolicies } from "@/lib/governance-runtime.server";

/** Executive report catalogue for the Policymaker workspace. */
const EXECUTIVE_KINDS = [
  ["Annual Crime Report", "Statewide crime volume, disposal and conviction for the financial year."],
  ["District Intelligence Report", "District-level risk, growth and performance comparison."],
  ["Policy Evaluation Report", "Before/after outcomes of implemented policy interventions."],
  ["Resource Planning Report", "Personnel, station, fleet and forensic capacity requirement."],
  ["Cyber Crime Report", "Cyber typologies, growth and investigative capacity gaps."],
  ["Women Safety Report", "Complaint trends, disposal quality and safety infrastructure."],
  ["Crime Forecast Report", "Four-quarter forecast by district and category."],
  ["Executive Summary", "One-page brief for the Home Department and DGP office."],
] as const;

export const Route = createFileRoute("/api/reports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fy = url.searchParams.get("fy") ?? "FY 2025-26";
        const district = url.searchParams.get("district") ?? "Karnataka statewide";
        const executive = EXECUTIVE_KINDS.map(([title, summary], i) => ({
          id: `EXR-${1000 + i}`,
          title,
          kind: "Executive",
          scope: district,
          period: fy,
          pages: 12 + i * 4,
          generatedAt: new Date(Date.now() - i * 86400000).toISOString(),
          classification: i % 3 === 0 ? "Restricted" : "Official Use Only",
          sections: [
            "Header",
            "Summary",
            "Evidence",
            "Visualizations",
            "Recommendations",
            "References",
            "Digital Signature",
          ],
          summary,
        }));
        return Response.json({
          reports: [...executive, ...(await getReports(parseFilters(request)))],
          policies: listPolicies(),
        });
      },
    },
  },
});
