"use client";
import { useEffect, useState } from "react";
import { Button } from "@kit/ui";

type S = { authenticated: boolean; user?: { name?: string; sub: string }; csrfToken?: string };

export function AuthStatus() {
  const [s, setS] = useState<S | null>(null);
  useEffect(() => { void fetch("/api/auth/session").then((r) => r.json()).then(setS); }, []);
  if (!s) return <p aria-live="polite">Checking session…</p>;
  if (!s.authenticated) return <a href="/api/auth/login?returnTo=/account">Sign in</a>;
  return (
    <p>
      Signed in as <strong data-testid="user">{s.user?.name ?? s.user?.sub}</strong>{" "}
      <Button variant="secondary" onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": s.csrfToken! } });
        location.href = "/";
      }}>Sign out</Button>
    </p>
  );
}
