import { createFileRoute } from "@tanstack/react-router";
import { getPredictions } from "@/lib/intelligence-runtime.server";
import { parseFilters } from "@/lib/intelligence-filters.server";

export const Route = createFileRoute("/api/predictions")({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json(await getPredictions(parseFilters(request))),
    },
  },
});
