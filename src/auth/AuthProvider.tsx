import * as React from "react";
import {
  fetchAuthUser,
  readStoredSession,
  refreshAuthSession,
  signInWithPassword as requestSignIn,
  signOutRemote,
  signUpWithPassword as requestSignUp,
  storeSession,
  supabaseConfigured,
  SupabaseRequestError,
  type AuthSession,
  type AuthUser,
  type SignupProfile,
} from "@/lib/supabase";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: SignupProfile, redirectTo?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function sessionFromHash(): { accessToken: string; refreshToken: string } | null {
  if (!window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [loading, setLoading] = React.useState(true);

  const commitSession = React.useCallback((nextSession: AuthSession | null) => {
    storeSession(nextSession);
    setSession(nextSession);
  }, []);

  React.useEffect(() => {
    let active = true;

    async function initialize() {
      if (!supabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const callbackTokens = sessionFromHash();
        if (callbackTokens) {
          let current = readStoredSession();
          const user = await fetchAuthUser(callbackTokens.accessToken);
          const expiresIn = 3600;
          current = {
            access_token: callbackTokens.accessToken,
            refresh_token: callbackTokens.refreshToken,
            token_type: "bearer",
            expires_in: expiresIn,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn,
            user,
          };
          if (active) commitSession(current);
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        } else {
          const saved = readStoredSession();
          if (saved) {
            let valid = saved;
            if (saved.expires_at * 1000 < Date.now() + 60_000) {
              const refreshed = await refreshAuthSession(saved);
              if (!refreshed) throw new Error("Your session expired. Please sign in again.");
              valid = refreshed;
            } else {
              try {
                const activeUser = await fetchAuthUser(saved.access_token);
                valid = { ...saved, user: activeUser };
              } catch (err) {
                if (err instanceof SupabaseRequestError && (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 400)) {
                  throw err;
                }
              }
            }
            if (active) commitSession(valid);
          }
        }
      } catch {
        if (active) commitSession(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [commitSession]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "twologue-auth-session") setSession(readStoredSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Refreshes an active session before its access token expires.
  React.useEffect(() => {
    if (!session || !supabaseConfigured) return;
    let cancelled = false;
    let retryTimer: number | undefined;
    const millisecondsUntilRefresh = Math.max(1_000, session.expires_at * 1_000 - Date.now() - 60_000);
    const refresh = async () => {
      try {
        const refreshed = await refreshAuthSession(session);
        if (!cancelled && refreshed) commitSession(refreshed);
        else if (!cancelled && !refreshed) commitSession(null);
      } catch {
        if (!cancelled) {
          const remaining = session.expires_at * 1_000 - Date.now();
          if (remaining <= 0) commitSession(null);
          else retryTimer = window.setTimeout(() => void refresh(), Math.min(30_000, remaining));
        }
      }
    };
    const timer = window.setTimeout(() => void refresh(), millisecondsUntilRefresh);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [session, commitSession]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const nextSession = await requestSignIn(email.trim(), password);
    if (!nextSession) throw new Error("Supabase did not return a session. Check your authentication settings.");
    commitSession(nextSession);
  }, [commitSession]);

  const signUp = React.useCallback(async (email: string, password: string, profile: SignupProfile, redirectTo?: string) => {
    const result = await requestSignUp(email.trim(), password, profile, redirectTo);
    const nextSession = result.access_token && result.refresh_token && result.user
      ? {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          token_type: result.token_type ?? "bearer",
          expires_in: result.expires_in ?? 3600,
          expires_at: result.expires_at ?? Math.floor(Date.now() / 1000) + (result.expires_in ?? 3600),
          user: result.user,
        } satisfies AuthSession
      : null;
    if (nextSession) commitSession(nextSession);
    return Boolean(nextSession);
  }, [commitSession]);

  const signOut = React.useCallback(async () => {
    const current = session;
    commitSession(null);
    if (current) {
      try {
        await signOutRemote(current.access_token);
      } catch {
        // Local sign-out must still complete if the network is unavailable.
      }
    }
  }, [commitSession, session]);

  const value = React.useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [session, loading, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
