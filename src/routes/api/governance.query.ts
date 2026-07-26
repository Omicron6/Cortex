import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runGovernanceQuery } from "@/lib/governance-runtime.server";

const schema = z.object({
  role: z.string().max(64).default("policymaker"),
  filters: z
    .object({
      fy: z.string().max(32).optional(),
      district: z.string().max(64).optional(),
      category: z.string().max(64).optional(),
      segment: z.string().max(64).optional(),
    })
    .default({}),
  query: z.string().min(2).max(600),
});

export const Route = createFileRoute("/api/governance/query")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid governance query." }, { status: 400 });
        }
        return Response.json(await runGovernanceQuery(parsed.data));
      },
    },
  },
});
