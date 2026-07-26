import { createFileRoute } from "@tanstack/react-router";
import { getHistory } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const caseId = new URL(request.url).searchParams.get("caseId");
        const entries = await getHistory(caseId ?? undefined);
        return Response.json({ entries });
      },
    },
  },
});
