import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runPolicySimulation } from "@/lib/governance-runtime.server";

const schema = z.object({
  policy: z.string().min(2).max(160),
  parameters: z.object({
    magnitude: z.number().min(1).max(100),
    horizonMonths: z.number().min(3).max(60),
    district: z.string().max(64).optional(),
  }),
});

export const Route = createFileRoute("/api/policy-simulation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid simulation request." }, { status: 400 });
        }
        return Response.json(await runPolicySimulation(parsed.data));
      },
    },
  },
});
