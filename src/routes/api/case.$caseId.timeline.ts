import { createFileRoute } from "@tanstack/react-router";
import { getCase, getTimeline } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/case/$caseId/timeline")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!(await getCase(params.caseId)))
          return Response.json({ error: "Case not found" }, { status: 404 });
        return Response.json({
          caseId: params.caseId,
          events: await getTimeline(params.caseId),
        });
      },
    },
  },
});
