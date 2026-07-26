import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { InvestigatorShell } from "@/components/investigator/InvestigatorShell";
import { readSession, useHydrated } from "@/lib/cortex-session";

const searchSchema = z.object({ caseId: z.string().optional() });

export const Route = createFileRoute("/investigator")({
  validateSearch: searchSchema,
  component: InvestigatorLayout,
});

function InvestigatorLayout() {
  const { caseId } = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !readSession()) navigate({ to: "/auth", replace: true });
  }, [hydrated, navigate]);

  return (
    <InvestigatorShell caseId={caseId}>
      <Outlet />
    </InvestigatorShell>
  );
}
