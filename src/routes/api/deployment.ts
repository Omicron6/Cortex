import { createFileRoute } from "@tanstack/react-router";
import { getDeployment } from "@/lib/decision-runtime.server";

export const Route = createFileRoute("/api/deployment")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        return Response.json(
          await getDeployment(
            params.get("district")?.slice(0, 80),
            params.get("template")?.slice(0, 80) ?? undefined,
          ),
        );
      },
    },
  },
});
