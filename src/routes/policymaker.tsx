import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PolicymakerShell } from "@/components/policymaker/PolicymakerShell";
import { governanceSearchSchema } from "@/lib/governance-scope";
import { readSession, useHydrated } from "@/lib/cortex-session";

export const Route = createFileRoute("/policymaker")({
  validateSearch: governanceSearchSchema,
  component: PolicymakerLayout,
});

function PolicymakerLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [hydrated, navigate]);

  return (
    <PolicymakerShell search={search}>
      <Outlet />
    </PolicymakerShell>
  );
}
