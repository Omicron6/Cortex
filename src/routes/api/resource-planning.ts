import { createFileRoute } from "@tanstack/react-router";
import { getResourcePlanning, parseGovernanceFilters } from "@/lib/governance-runtime.server";

export const Route = createFileRoute("/api/resource-planning")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const resources = await getResourcePlanning(parseGovernanceFilters(request));
        return Response.json({ resources });
      },
    },
  },
});
