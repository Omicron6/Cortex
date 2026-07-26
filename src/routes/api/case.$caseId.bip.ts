import { createFileRoute } from "@tanstack/react-router";
import { getBip, getCase } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/case/$caseId/bip")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!(await getCase(params.caseId)))
          return Response.json({ error: "Case not found" }, { status: 404 });
        return Response.json(await getBip(params.caseId));
      },
    },
  },
});
