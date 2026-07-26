import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runScenario } from "@/lib/decision-runtime.server";

const bodySchema = z.object({
  district: z.string().max(80).optional(),
  scenario: z.string().min(4).max(2000),
  role: z.string().min(2).max(40),
  additionalContext: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/decision/scenario")({
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
        return Response.json(await runScenario(parsed.data));
      },
    },
  },
});
