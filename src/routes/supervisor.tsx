import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SupervisorShell } from "@/components/supervisor/SupervisorShell";
import { supervisorSearchSchema } from "@/lib/supervisor-scope";
import { readSession, useHydrated } from "@/lib/cortex-session";

export const Route = createFileRoute("/supervisor")({
  validateSearch: supervisorSearchSchema,
  component: SupervisorLayout,
});

function SupervisorLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [hydrated, navigate]);

  return (
    <SupervisorShell search={search}>
      <Outlet />
    </SupervisorShell>
  );
}
