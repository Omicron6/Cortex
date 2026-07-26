import { createFileRoute } from "@tanstack/react-router";
import { getStrategicIntelligence, parseGovernanceFilters } from "@/lib/governance-runtime.server";

export const Route = createFileRoute("/api/governance/strategy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const strategy = await getStrategicIntelligence(parseGovernanceFilters(request));
        return Response.json({ strategy });
      },
    },
  },
});
