import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCase, runChat } from "@/lib/investigation-runtime.server";

const bodySchema = z.object({
  caseId: z.string().min(3).max(64),
  role: z.string().min(2).max(40),
  message: z.string().min(1).max(2000),
  conversationId: z.string().min(3).max(64).optional(),
  /** Base64 evidence images for the multimodal VLM (max 3). */
  images: z.array(z.string().min(16).max(8_000_000)).max(3).optional(),
});


export const Route = createFileRoute("/api/chat")({
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
        if (!(await getCase(parsed.data.caseId))) {
          return Response.json({ error: "Case not found" }, { status: 404 });
        }
        return Response.json(await runChat(parsed.data));
      },
    },
  },
});
