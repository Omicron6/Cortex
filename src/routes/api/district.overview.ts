import { createFileRoute } from "@tanstack/react-router";
import { getDistrictOverview } from "@/lib/decision-runtime.server";

export const Route = createFileRoute("/api/district/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const district = new URL(request.url).searchParams.get("district") ?? undefined;
        return Response.json(await getDistrictOverview(district?.slice(0, 80)));
      },
    },
  },
});
