import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runQuery } from "@/lib/intelligence-runtime.server";
import { filtersSchema } from "@/lib/intelligence-filters.server";

const bodySchema = z.object({
  role: z.string().min(2).max(40),
  filters: filtersSchema.default({}),
  message: z.string().min(1).max(2000),
});

export const Route = createFileRoute("/api/intelligence/query")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid request payload" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Invalid request payload" }, { status: 400 });
        }
        return Response.json(await runQuery(parsed.data));
      },
    },
  },
});
