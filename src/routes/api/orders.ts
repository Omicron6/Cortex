import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getOrders, issueOrder } from "@/lib/decision-runtime.server";

const bodySchema = z.object({
  orderId: z.string().min(2).max(60),
  title: z.string().min(2).max(300),
  target: z.string().min(2).max(200),
});

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const district = new URL(request.url).searchParams.get("district") ?? undefined;
        return Response.json(await getOrders(district?.slice(0, 80)));
      },
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
        return Response.json(issueOrder(parsed.data));
      },
    },
  },
});
