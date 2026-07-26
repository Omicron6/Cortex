import { useEffect, useState } from "react";
import type { RoleId } from "./cortex-data";

const AUTH_KEY = "cortex.session";
const ROLE_KEY = "cortex.workspace";

export interface CortexSession {
  username: string;
  authenticatedAt: string;
}

export function readSession(): CortexSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as CortexSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(username: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ username, authenticatedAt: new Date().toISOString() }),
  );
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function setActiveRole(role: RoleId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getActiveRole(): RoleId | null {
  if (typeof window === "undefined") return null;
  return (window.localStorage.getItem(ROLE_KEY) as RoleId) ?? null;
}

/** True only after hydration — safe for reading browser storage in render. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useSession() {
  const hydrated = useHydrated();
  const [session, setSession] = useState<CortexSession | null>(null);
  useEffect(() => setSession(readSession()), []);
  return { session, hydrated };
}
