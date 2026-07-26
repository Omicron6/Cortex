import { createFileRoute } from "@tanstack/react-router";
import {
  getGovernanceDashboard,
  parseGovernanceFilters,
} from "@/lib/governance-runtime.server";

export const Route = createFileRoute("/api/governance/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const dashboard = await getGovernanceDashboard(parseGovernanceFilters(request));
        return Response.json({ dashboard });
      },
    },
  },
});
