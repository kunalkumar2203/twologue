import * as React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="mx-auto flex min-h-[45vh] w-full max-w-lg items-center justify-center text-sm text-ink-soft">Opening your space…</div>;
  }
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
