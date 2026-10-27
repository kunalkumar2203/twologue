import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SignupProfile = {
  displayName: string;
  gender: string;
  age: number;
  timeZone: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: AuthUser;
};

type SupabaseAuthResponse = Omit<Partial<AuthSession>, "user"> & {
  user?: AuthUser | null;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

type SupabaseDatabase = {
  public: {
    Tables: {
      couples: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      invites: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      create_invite: { Args: { p_target_email?: string | null }; Returns: string };
      preview_invite: { Args: { p_code: string }; Returns: Record<string, unknown>[] };
      accept_invite: { Args: { p_code: string }; Returns: string };
      cancel_invite: { Args: Record<string, never>; Returns: null };
      unlink_couple: { Args: Record<string, never>; Returns: null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SESSION_KEY = "twologue-auth-session";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabaseSetupMessage =
  "Connect a Supabase project by setting VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. See SUPABASE_SETUP.md for the database setup steps.";

export class SupabaseRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(message: string, status?: number, code?: string, details?: string, hint?: string) {
    super(message);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new SupabaseRequestError(supabaseSetupMessage);
}

let activeAccessToken = "";
let sessionClient: SupabaseClient<SupabaseDatabase> | null = null;

export function supabaseForSession(session: AuthSession) {
  requireConfig();
  activeAccessToken = session.access_token;
  if (!sessionClient) {
    sessionClient = createClient<SupabaseDatabase>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `Bearer ${activeAccessToken}`);
          return fetch(input, { ...init, headers });
        },
      },
    });
  }
  sessionClient.realtime.setAuth(session.access_token);
  return sessionClient;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!response.ok) {
    const errorData = data as {
      msg?: string;
      message?: string;
      error_description?: string;
      error?: string;
      code?: string;
      details?: string;
      hint?: string;
    } | null;
    const message = errorData?.msg ?? errorData?.message ?? errorData?.error_description ?? errorData?.error;
    throw new SupabaseRequestError(
      message || `Supabase request failed (${response.status}).`,
      response.status,
      errorData?.code,
      errorData?.details,
      errorData?.hint,
    );
  }
  return data as T;
}

function authHeaders(accessToken?: string): Record<string, string> {
  requireConfig();
  return {
    apikey: SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY!}`,
    "Content-Type": "application/json",
  };
}

function normalizeSession(data: SupabaseAuthResponse): AuthSession | null {
  if (!data.access_token || !data.refresh_token || !data.user) return null;
  const expiresIn = data.expires_in ?? 3600;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type ?? "bearer",
    expires_in: expiresIn,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + expiresIn,
    user: data.user,
  };
}

export function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function signUpWithPassword(email: string, password: string, profile: SignupProfile, redirectTo?: string) {
  requireConfig();
  const redirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? `${window.location.origin}${redirectTo}`
    : `${window.location.origin}/auth`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: profile.displayName.trim(),
        gender: profile.gender,
        age: profile.age,
        time_zone: profile.timeZone,
      },
    }),
  });
  return parseResponse<SupabaseAuthResponse>(response);
}

export async function signInWithPassword(email: string, password: string) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return normalizeSession(await parseResponse<SupabaseAuthResponse>(response));
}

export async function refreshAuthSession(session: AuthSession) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  return normalizeSession(await parseResponse<SupabaseAuthResponse>(response));
}

export async function fetchAuthUser(accessToken: string) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(accessToken) });
  return parseResponse<AuthUser>(response);
}

export async function signOutRemote(accessToken: string) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: authHeaders(accessToken) });
  if (!response.ok) await parseResponse<unknown>(response);
}

export async function restGet<T>(pathAndQuery: string, session: AuthSession): Promise<T> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { ...authHeaders(session.access_token), Accept: "application/json" },
  });
  return parseResponse<T>(response);
}

export async function restRpc<T>(name: string, args: Record<string, unknown>, session: AuthSession): Promise<T> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: authHeaders(session.access_token),
    body: JSON.stringify(args),
  });
  return parseResponse<T>(response);
}

export async function restPatch<T>(pathAndQuery: string, body: Record<string, unknown>, session: AuthSession): Promise<T> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method: "PATCH",
    headers: { ...authHeaders(session.access_token), Accept: "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}
