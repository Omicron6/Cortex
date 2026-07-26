import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ClipboardList,
  Gauge,
  Home,
  Languages,
  LogOut,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CortexMark } from "@/components/cortex/CortexMark";
import { IntelligenceTicker } from "@/components/cortex/IntelligenceTicker";
import { clearSession } from "@/lib/cortex-session";
import type { SupervisorSearch } from "@/lib/supervisor-scope";

const NAV = [
  { to: "/console", label: "Home", hint: "Workspace console", icon: Home },
  { to: "/supervisor", label: "Decision Workspace", hint: "ADIE command", icon: Radar },
  { to: "/supervisor/threats", label: "Threat Intelligence", hint: "Live threat picture", icon: ShieldAlert },
  { to: "/supervisor/deployment", label: "Force Deployment", hint: "Personnel & units", icon: Users },
  { to: "/supervisor/orders", label: "Orders & Directives", hint: "Issue & log", icon: ClipboardList },
  { to: "/supervisor/operations", label: "District Operations", hint: "Performance", icon: Gauge },
] as const;

interface Props {
  search: SupervisorSearch;
  children: ReactNode;
}

export function SupervisorShell({ search, children }: Props) {
  const [lang, setLang] = useState<"EN" | "ಕನ್ನಡ">("EN");
  const navigate = useNavigate();

  return (
    <div data-workspace="supervisor" className="flex min-h-screen w-full flex-col bg-background">
      <IntelligenceTicker />

      <header className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4">
        <Link to="/console" className="flex min-w-0 items-center gap-3">
          <CortexMark size={26} className="shrink-0" />
          <div className="min-w-0 leading-none">
            <div className="truncate font-display text-sm font-bold tracking-[0.24em]">CORTEX</div>
            <div className="label-meta mt-1 truncate">WS-03 · Supervisor · ADIE</div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <span className="mr-1 hidden border border-gold/40 bg-gold/8 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold xl:block">
            Command &amp; Control
          </span>
          <button
            onClick={() => setLang(lang === "EN" ? "ಕನ್ನಡ" : "EN")}
            className="hidden h-8 items-center gap-1.5 border border-border px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:flex"
          >
            <Languages className="size-3.5" />
            {lang}
          </button>
          <button className="relative flex size-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
            <Bell className="size-3.5" />
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-maroon" />
          </button>
          <div className="ml-1 hidden items-center gap-2 border border-khaki/35 bg-khaki/5 px-2 py-1 lg:flex">
            <ShieldCheck className="size-3.5 text-gold" />
            <div className="leading-tight">
              <div className="font-mono text-[11px] text-khaki">KSP-SP-0142</div>
              <div className="label-meta !text-[9px]">Verified device</div>
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

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border bg-sidebar lg:w-56 lg:border-b-0 lg:border-r">
          <div className="hidden border-b border-border px-3 py-3 lg:block">
            <div className="label-tech">Command Modules</div>
          </div>
          <nav className="flex overflow-x-auto lg:flex-col lg:overflow-visible lg:py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                search={item.to === "/console" ? undefined : search}
                activeOptions={{ exact: item.to === "/supervisor" }}
                activeProps={{ className: "border-ws bg-surface/55 text-foreground" }}
                inactiveProps={{
                  className:
                    "border-transparent text-muted-foreground hover:border-ws/40 hover:bg-surface/25 hover:text-foreground",
                }}
                className="flex shrink-0 items-center gap-2.5 border-b-2 px-3 py-2.5 transition-colors lg:border-b-0 lg:border-l-2"
              >
                <item.icon className="size-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{item.label}</span>
                  <span className="label-meta hidden truncate !text-[9px] lg:block">
                    {item.hint}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
