import { supabaseForSession, type AuthSession } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

// Calls a database function as the signed-in person
type RpcName = keyof Database["public"]["Functions"];

export async function callRpc<T>(
  session: AuthSession,
  fn: RpcName,
  args: Database["public"]["Functions"][RpcName]["Args"] = {} as Database["public"]["Functions"][RpcName]["Args"],
) {
  const { data, error } = await supabaseForSession(session).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

const SHARED_MESSAGES: Record<string, string> = {
  not_authenticated: "Your sign-in has expired. Please sign in again.",
  feature_paused: "This is paused for you both right now.",
  "Failed to fetch": "We couldn't reach Twologue. Check your connection and try again.",
};

// Turns a database error into a calm sentence. Unknown messages are shown as they are.
export function errorMessage(error: unknown, messages: Record<string, string> = {}) {
  const text = error instanceof Error ? error.message : "";
  return messages[text] ?? SHARED_MESSAGES[text] ?? (text || "Something went wrong. Please try again.");
}