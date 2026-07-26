import { createFileRoute } from "@tanstack/react-router";
import { getSocial } from "@/lib/intelligence-runtime.server";
import { parseFilters } from "@/lib/intelligence-filters.server";

export const Route = createFileRoute("/api/intelligence/social")({
  server: {
    handlers: {
      GET: async ({ request }) => Response.json(await getSocial(parseFilters(request))),
    },
  },
});
