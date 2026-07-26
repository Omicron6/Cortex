import { createFileRoute } from "@tanstack/react-router";
import { getNetwork } from "@/lib/intelligence-runtime.server";
import { parseFilters } from "@/lib/intelligence-filters.server";

export const Route = createFileRoute("/api/network")({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json(await getNetwork(parseFilters(request))),
    },
  },
});
