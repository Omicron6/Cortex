import { createFileRoute } from "@tanstack/react-router";
import { getPolicyImpact, parseGovernanceFilters } from "@/lib/governance-runtime.server";

export const Route = createFileRoute("/api/policy-impact")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const impact = await getPolicyImpact(parseGovernanceFilters(request));
        return Response.json({ impact });
      },
    },
  },
});
