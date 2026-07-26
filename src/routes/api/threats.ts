import { createFileRoute } from "@tanstack/react-router";
import { getThreats } from "@/lib/decision-runtime.server";

export const Route = createFileRoute("/api/threats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const district = new URL(request.url).searchParams.get("district") ?? undefined;
        return Response.json(await getThreats(district?.slice(0, 80)));
      },
    },
  },
});
