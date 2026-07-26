import { createFileRoute } from "@tanstack/react-router";
import { getCase } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/case/$caseId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const detail = await getCase(params.caseId);
        if (!detail) return Response.json({ error: "Case not found" }, { status: 404 });
        return Response.json(detail);
      },
    },
  },
});
