import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnalystShell } from "@/components/analyst/AnalystShell";
import { analystSearchSchema } from "@/lib/analyst-filters";
import { readSession, useHydrated } from "@/lib/cortex-session";

export const Route = createFileRoute("/analyst")({
  validateSearch: analystSearchSchema,
  component: AnalystLayout,
});

function AnalystLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [hydrated, navigate]);

  return (
    <AnalystShell search={search}>
      <Outlet />
    </AnalystShell>
  );
}
