import { createFileRoute } from "@tanstack/react-router";
import { getDashboard } from "@/lib/intelligence-runtime.server";
import { parseFilters } from "@/lib/intelligence-filters.server";

export const Route = createFileRoute("/api/intelligence/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const dashboard = await getDashboard(parseFilters(request));
        if (!dashboard) return Response.json({ dashboard: null });
        return Response.json({ dashboard });
      },
    },
  },
});
