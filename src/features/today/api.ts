import { getMyCouple } from "@/features/couples/api";
import { restGet, restRpc, type AuthSession } from "@/lib/supabase";

// Dev only: to run Today on fake data for demo; does not need Supabase connectivity.
// Turn it on with VITE_USE_MOCK_API=true in .env.local. Production builds ignore it.
export const USE_MOCK_API = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === "true";

// Extended features (mood, appreciation notes, daily challenges) use persistent local storage
// unless VITE_USE_REMOTE_EXTENSIONS=true is set after applying database migrations.
export const USE_REMOTE_EXTENSIONS = import.meta.env.VITE_USE_REMOTE_EXTENSIONS === "true";

export type DepthDial = "light" | "mixed" | "deep";

export type TodayState = {
  session_id: string;
  local_date: string;
  prompt: string;
  status: "open" | "revealed";
  revealed: boolean;
  revealed_at: string | null;
  my_name: string;
  partner_name: string;
  my_answer: string | null;
  partner_answer: string | null;
  my_answered: boolean;
  partner_answered: boolean;
  my_reveal_requested: boolean;
  partner_reveal_requested: boolean;
  // Post-reveal reactions (each partner can react once after reveal)
  my_reaction: string | null;
  partner_reaction: string | null;
  // Stats & settings
  days_answered_together: number;
  swap_used_today: boolean;
  depth_dial: DepthDial;
};

// What the Today screen can show: no shared space yet, the feature paused, or the question
export type TodayScreen =
  | { kind: "no-couple" }
  | { kind: "paused" }
  | { kind: "ready"; state: TodayState };

// Mood / emotional weather
export type MoodIcon = "☀️" | "⛅" | "🌩️" | "🌫️";
export const MOOD_OPTIONS: { icon: MoodIcon; label: string }[] = [
  { icon: "☀️", label: "Sunny" },
  { icon: "⛅", label: "Cloudy" },
  { icon: "🌩️", label: "Stormy" },
  { icon: "🌫️", label: "Foggy" },
];

export type MoodEntry = {
  id: string;
  icon: string;
  label: string;
  note: string;
  private: boolean;
  created_at: string;
};

// Appreciation notes
export type AppreciationNote = {
  id: string;
  from_name: string;
  template: string;
  body: string;
  emoji?: string;
  created_at: string;
  read: boolean;
  sent_by_me?: boolean;
};

export const NOTE_TEMPLATES = [
  "Thank you for…",
  "I noticed…",
  "I loved when you…",
  "You made me smile when…",
  "I'm grateful for…",
];

// Micro daily challenges
export type DailyChallenge = {
  id: string;
  title: string;
  body: string;
  category: "affection" | "words" | "play" | "reflection" | "service";
  remote_variant: string;
  duration_label: string;
};

function requireSession(session: AuthSession | null) {
  if (!session) throw new Error("Please sign in again.");
  return session;
}

// ─── Daily Question ─────────────────────────────────────────────────────────

export async function getTodayScreen(session: AuthSession | null): Promise<TodayScreen> {
  if (USE_MOCK_API) return (await import("./mock")).mockGetScreen();

  const auth = requireSession(session);
  const couple = await getMyCouple(auth);
  if (!couple.couple) return { kind: "no-couple" };

  const flags = await restGet<{ enabled: boolean }[]>(
    `shared_feature_settings?select=enabled&couple_id=eq.${encodeURIComponent(couple.couple.id)}&feature_key=eq.daily_question`,
    auth,
  );
  if (flags[0]?.enabled === false) return { kind: "paused" };

  return { kind: "ready", state: await restRpc<TodayState>("get_today_state", {}, auth) };
}

export async function submitDailyAnswer(session: AuthSession | null, sessionId: string, answer: string) {
  if (USE_MOCK_API) return (await import("./mock")).mockSubmitAnswer(answer);
  await restRpc<null>("submit_daily_answer", { p_session_id: sessionId, p_answer: answer }, requireSession(session));
}

// True when this request completed the reveal for both partners
export async function requestDailyReveal(session: AuthSession | null, sessionId: string) {
  if (USE_MOCK_API) return (await import("./mock")).mockRequestReveal();
  return restRpc<boolean>("request_daily_reveal", { p_session_id: sessionId }, requireSession(session));
}

export async function swapDailyQuestion(session: AuthSession | null, sessionId: string) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSwapQuestion();
  await restRpc<null>("swap_daily_question", { p_session_id: sessionId }, requireSession(session));
}

export async function submitRevealReaction(session: AuthSession | null, sessionId: string, reaction: string) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSubmitReaction(reaction);
  await restRpc<null>("submit_reveal_reaction", { p_session_id: sessionId, p_reaction: reaction }, requireSession(session));
}

// ─── Mood / Emotional Weather ────────────────────────────────────────────────

export async function getMyMood(session: AuthSession | null): Promise<MoodEntry | null> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetMyMood();
  try {
    const auth = requireSession(session);
    const rows = await restGet<MoodEntry[]>(`daily_moods?select=*&order=created_at.desc&limit=1`, auth);
    return rows[0] ?? null;
  } catch {
    return (await import("./mock")).mockGetMyMood();
  }
}

export async function getPartnerMood(session: AuthSession | null): Promise<MoodEntry | null> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetPartnerMood();
  try {
    const auth = requireSession(session);
    const rows = await restGet<MoodEntry[]>(`partner_mood?select=*&limit=1`, auth);
    return rows[0] ?? null;
  } catch {
    return (await import("./mock")).mockGetPartnerMood();
  }
}

export async function setMyMood(
  session: AuthSession | null,
  entry: Omit<MoodEntry, "id" | "created_at">,
) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSetMood(entry);
  try {
    await restRpc<null>("set_my_mood", { p_icon: entry.icon, p_label: entry.label, p_note: entry.note, p_private: entry.private }, requireSession(session));
  } catch {
    return (await import("./mock")).mockSetMood(entry);
  }
}

export async function clearMyMood(session: AuthSession | null) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockClearMood();
  try {
    await restRpc<null>("clear_my_mood", {}, requireSession(session));
  } catch {
    return (await import("./mock")).mockClearMood();
  }
}

// ─── Appreciation Notes ──────────────────────────────────────────────────────

export async function getReceivedNotes(session: AuthSession | null): Promise<AppreciationNote[]> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetReceivedNotes();
  try {
    return await restRpc<AppreciationNote[]>("get_appreciation_notes", { p_scope: "received" }, requireSession(session));
  } catch {
    return (await import("./mock")).mockGetReceivedNotes();
  }
}

export async function getSentNotes(session: AuthSession | null): Promise<AppreciationNote[]> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetSentNotes();
  try {
    return await restRpc<AppreciationNote[]>("get_appreciation_notes", { p_scope: "sent" }, requireSession(session));
  } catch {
    return (await import("./mock")).mockGetSentNotes();
  }
}

export async function sendAppreciationNote(
  session: AuthSession | null,
  note: { template: string; body: string; emoji?: string },
) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSendNote(note);
  try {
    await restRpc<null>("send_appreciation_note", {
      p_template: note.template,
      p_body: note.body,
      p_emoji: note.emoji ?? null,
      p_photo_path: null,
    }, requireSession(session));
  } catch {
    return (await import("./mock")).mockSendNote(note);
  }
}

export async function markNoteRead(session: AuthSession | null, noteId: string) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockMarkNoteRead(noteId);
  try {
    await restRpc<null>("mark_appreciation_note_read", { p_note_id: noteId }, requireSession(session));
  } catch {
    return (await import("./mock")).mockMarkNoteRead(noteId);
  }
}

// ─── Micro Daily Challenge ───────────────────────────────────────────────────

export async function getDailyChallenge(session: AuthSession | null): Promise<DailyChallenge | null> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetChallenge();
  try {
    const auth = requireSession(session);
    const rows = await restGet<DailyChallenge[]>(`daily_challenge?select=*&limit=1`, auth);
    return rows[0] ?? null;
  } catch {
    return (await import("./mock")).mockGetChallenge();
  }
}

export async function getChallengeStatus(session: AuthSession | null): Promise<{ done: boolean; note: string }> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetChallengeStatus();
  try {
    const auth = requireSession(session);
    const rows = await restGet<{ done: boolean; note: string }[]>(`daily_challenge_status?select=done,note&limit=1`, auth);
    return rows[0] ?? { done: false, note: "" };
  } catch {
    return (await import("./mock")).mockGetChallengeStatus();
  }
}

export async function completeChallenge(session: AuthSession | null, note: string) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockCompleteChallenge(note);
  try {
    await restRpc<null>("complete_daily_challenge", { p_note: note }, requireSession(session));
  } catch {
    return (await import("./mock")).mockCompleteChallenge(note);
  }
}
