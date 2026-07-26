import { createFileRoute } from "@tanstack/react-router";
import { listCases } from "@/lib/investigation-runtime.server";

export const Route = createFileRoute("/api/cases")({
  server: {
    handlers: {
      GET: async () => Response.json({ cases: await listCases() }),
    },
  },
});
