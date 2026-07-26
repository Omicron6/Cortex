import { createFileRoute } from "@tanstack/react-router";
import { getDistrictOperations } from "@/lib/decision-runtime.server";

export const Route = createFileRoute("/api/district/operations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const district = new URL(request.url).searchParams.get("district") ?? undefined;
        return Response.json(await getDistrictOperations(district?.slice(0, 80)));
      },
    },
  },
});
