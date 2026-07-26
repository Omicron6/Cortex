import { createFileRoute } from "@tanstack/react-router";
import { getSummary } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/case/$caseId/summary")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const summary = await getSummary(params.caseId);
        if (!summary) return Response.json({ error: "Case not found" }, { status: 404 });
        return Response.json(summary);
      },
    },
  },
});
