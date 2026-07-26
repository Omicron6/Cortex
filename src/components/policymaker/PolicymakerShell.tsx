import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  FileBarChart,
  Home,
  Landmark,
  Languages,
  LogOut,
  ScrollText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { CortexMark } from "@/components/cortex/CortexMark";
import { IntelligenceTicker } from "@/components/cortex/IntelligenceTicker";
import { clearSession } from "@/lib/cortex-session";
import type { GovernanceSearch } from "@/lib/governance-scope";

const NAV = [
  { to: "/console", label: "Home", hint: "Workspace console", icon: Home },
  { to: "/policymaker", label: "Governance Workspace", hint: "AGIE dashboard", icon: Landmark },
  { to: "/policymaker/strategy", label: "Strategic Intelligence", hint: "Long-term trends", icon: TrendingUp },
  { to: "/policymaker/impact", label: "Policy Impact", hint: "Outcome evaluation", icon: ScrollText },
  { to: "/policymaker/resources", label: "Resource Planning", hint: "Capacity & investment", icon: Building2 },
  { to: "/policymaker/reports", label: "Executive Reports", hint: "Official dossiers", icon: FileBarChart },
] as const;

interface Props {
  search: GovernanceSearch;
  children: ReactNode;
}

export function PolicymakerShell({ search, children }: Props) {
  const [lang, setLang] = useState<"EN" | "ಕನ್ನಡ">("EN");
  const navigate = useNavigate();

  return (
    <div data-workspace="policymaker" className="flex min-h-screen w-full flex-col bg-background">
      <IntelligenceTicker />

      <header className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4">
        <Link to="/console" className="flex min-w-0 items-center gap-3">
          <CortexMark size={26} className="shrink-0" />
          <div className="min-w-0 leading-none">
            <div className="truncate font-display text-sm font-bold tracking-[0.24em]">CORTEX</div>
            <div className="label-meta mt-1 truncate">WS-04 · Policymaker · AGIE</div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <span className="label-official mr-2 hidden text-[10px] lg:inline">
            {search.fy ?? "FY 2025-26"}
          </span>
          <button
            onClick={() => setLang(lang === "EN" ? "ಕನ್ನಡ" : "EN")}
            className="hidden h-8 items-center gap-1.5 border border-border px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground sm:flex"
            aria-label="Switch language"
          >
            <Languages className="size-3.5" />
            {lang}
          </button>
          <button
            className="relative flex size-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-3.5" />
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-gold" />
          </button>
          <div className="ml-1 hidden items-center gap-2 border border-gold/35 bg-gold/5 px-2 py-1 lg:flex">
            <ShieldCheck className="size-3.5 text-gold" />
            <div className="leading-tight">
              <div className="font-mono text-[11px] text-khaki">HOME-DEPT-0114</div>
              <div className="label-meta !text-[9px]">Executive clearance</div>
            </div>
          </div>
          <button
            onClick={() => {
              clearSession();
              navigate({ to: "/auth", replace: true });
            }}
            className="flex size-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-critical/60 hover:text-critical"
            aria-label="Log out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </header>

      <nav
        aria-label="Governance modules"
        className="flex gap-px overflow-x-auto border-b border-border bg-sidebar"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            search={item.to.startsWith("/policymaker") ? (search as never) : undefined}
            activeOptions={{ exact: true }}
            activeProps={{ className: "border-b-2 !border-b-gold bg-surface/50 text-foreground" }}
            inactiveProps={{ className: "border-b-2 border-b-transparent text-muted-foreground" }}
            className="flex shrink-0 items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface/30 hover:text-foreground"
          >
            <item.icon className="size-3.5" />
            <span className="whitespace-nowrap text-xs font-medium">{item.label}</span>
            <span className="label-meta !text-[9px] hidden xl:inline">{item.hint}</span>
          </Link>
        ))}
      </nav>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
