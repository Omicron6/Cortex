import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Search,
  ShieldCheck,
  Languages,
} from "lucide-react";
import { CortexMark } from "./CortexMark";
import { IntelligenceTicker } from "./IntelligenceTicker";
import type { Workspace } from "@/lib/cortex-data";
import { clearSession } from "@/lib/cortex-session";

interface Props {
  workspace: Workspace;
  active: string;
  onSelect: (label: string) => void;
  children: ReactNode;
}

export function AppShell({ workspace, active, onSelect, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [lang, setLang] = useState<"EN" | "ಕನ್ನಡ">("EN");
  const navigate = useNavigate();

  return (
    <div
      data-workspace={workspace.id}
      className="flex min-h-screen w-full flex-col bg-background"
    >
      <IntelligenceTicker />

      <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
        <Link to="/console" className="flex items-center gap-3">
          <CortexMark size={26} className="text-ws" />
          <div className="leading-none">
            <div className="font-display text-sm font-bold tracking-[0.24em]">CORTEX</div>
            <div className="label-meta mt-1">
              {workspace.code} · {workspace.role}
            </div>
          </div>
        </Link>

        <div className="relative mx-auto hidden w-full max-w-xl items-center md:flex">
          <Search className="absolute left-3 size-3.5 text-primary/70" />
          <input
            className="h-9 w-full border border-input bg-background pl-9 pr-24 font-mono text-xs text-foreground outline-none placeholder:text-subtle focus:border-primary/60 focus:ring-1 focus:ring-ring"
            placeholder="Search FIR, Person, Vehicle, Phone, Police Station"
          />
          <span className="label-tech absolute right-3">⌘K</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "EN" ? "ಕನ್ನಡ" : "EN")}
            className="flex h-8 items-center gap-1.5 border border-border px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
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
              <div className="font-mono text-[11px] text-khaki">KSP-OFFICER-2291</div>
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

      <div className="flex flex-1">
        <aside
          className={`hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex ${
            collapsed ? "w-14" : "w-60"
          }`}
        >
          <div className="border-b border-border px-3 py-3">
            {!collapsed && <div className="label-tech">Operational Modules</div>}
          </div>
          <nav className="flex flex-1 flex-col py-2">
            {workspace.nav.map((item) => {
              const isActive = item.label === active;
              return (
                <button
                  key={item.label}
                  onClick={() => onSelect(item.label)}
                  className={`group flex items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-ws bg-surface/55 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-ws/40 hover:bg-surface/25 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 shrink-0 ${isActive ? "bg-ws" : "bg-khaki/40"}`}
                  />
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{item.label}</span>
                      <span className="label-meta !text-[9px] block truncate">{item.hint}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center gap-2 border-t border-border py-2 text-muted-foreground transition-colors hover:text-primary"
          >
            {collapsed ? (
              <ChevronsRight className="size-3.5" />
            ) : (
              <>
                <ChevronsLeft className="size-3.5" />
                <span className="label-tech">Collapse</span>
              </>
            )}
          </button>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
