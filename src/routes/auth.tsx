import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldCheck, User } from "lucide-react";
import { GraphBackdrop } from "@/components/cortex/GraphBackdrop";
import { CortexMark } from "@/components/cortex/CortexMark";
import { writeSession } from "@/lib/cortex-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Secure Authentication — CORTEX" },
      {
        name: "description",
        content:
          "Restricted access console for authorized Karnataka State Police personnel. Role-bound identity via Zoho Catalyst Authentication.",
      },
      { property: "og:title", content: "Secure Authentication — CORTEX" },
      {
        property: "og:description",
        content: "Authorized personnel only. Sessions are logged for audit.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (u.length < 3 || password.length < 4) {
      setError("Credential format invalid. Verify officer ID and passphrase.");
      return;
    }
    setError("");
    setPending(true);
    window.setTimeout(() => {
      writeSession(u);
      navigate({ to: "/console" });
    }, 900);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-blueprint opacity-30" />
      <div className="absolute inset-0 text-primary/25">
        <GraphBackdrop nodes={40} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-core-glow" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <CortexMark size={30} className="text-primary" />
          <div className="text-center">
            <div className="font-display text-lg font-bold tracking-[0.32em] leading-none">
              CORTEX
            </div>
            <div className="label-official mt-1.5 text-[10px]">Secure Access Terminal</div>
          </div>
        </Link>

        <div className="corner-ticks panel p-7">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="label-official text-xs">Authentication</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-success">
              <span className="size-1.5 animate-pulse-node rounded-full bg-success" />
              CHANNEL ENCRYPTED
            </span>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block">
              <span className="label-meta">Officer ID</span>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={64}
                  autoComplete="username"
                  placeholder="ksp.officer.id"
                  className="h-11 w-full border border-input bg-background pl-9 pr-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-1 focus:ring-ring"
                />
              </div>
            </label>

            <label className="block">
              <span className="label-meta">Passphrase</span>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 w-full border border-input bg-background pl-9 pr-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-1 focus:ring-ring"
                />
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                aria-pressed={remember}
                className={`flex size-4 items-center justify-center border ${
                  remember ? "border-primary bg-primary/20" : "border-input"
                }`}
              >
                {remember && <span className="size-1.5 bg-primary" />}
              </button>
              <span className="text-xs text-muted-foreground">Remember Device</span>
            </label>

            {error && (
              <p className="border border-maroon/60 bg-maroon/15 px-3 py-2 font-mono text-[11px] text-critical">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-intel h-11 w-full disabled:opacity-70"
            >
              <ShieldCheck className="size-4" />
              {pending ? "Verifying…" : "Authenticate"}
            </button>
          </form>

          <p className="label-meta mt-5 block text-center">
            Powered by Zoho Catalyst Authentication.
          </p>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] text-subtle">
          Unauthorized access is an offence under applicable law. All attempts are logged.
        </p>
      </div>
    </div>
  );
}
