import { getMyCouple } from "@/features/couples/api";
import { restGet, restRpc, type AuthSession } from "@/lib/supabase";

// Dev only: to run Today on fake data for demo; does not need Supabase connectivity.
// Turn it on with VITE_USE_MOCK_API=true in .env.local. Production builds ignore it.
export const USE_MOCK_API = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === "true";

// Extended features (mood, appreciation notes, daily challenges) use persistent local storage
// unless VITE_USE_REMOTE_EXTENSIONS=true is set after applying database migrations.
export const USE_REMOTE_EXTENSIONS = import.meta.env.VITE_USE_REMOTE_EXTENSIONS === "true";
export const REMOTE_EXTENSIONS_ENABLED = USE_REMOTE_EXTENSIONS;

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
  // Post-reveal reactions (each partner can react with an emoji and an optional written reply)
  my_reaction: string | null;
  partner_reaction: string | null;
  my_reply: string | null;
  partner_reply: string | null;
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
  updated_at?: string;
};

// Returns true if mood was set today in the user's timezone AND within the last 24 hours.
// Automatically resets at 12:00 midnight based on local/anchor timezone or after 24 hours.
export function isMoodFresh(
  mood: { updated_at?: string; created_at?: string } | null | undefined,
  timeZone?: string,
): boolean {
  if (!mood) return false;
  const isoStr = mood.updated_at || mood.created_at;
  if (!isoStr) return false;

  const moodTime = new Date(isoStr).getTime();
  if (isNaN(moodTime)) return false;

  const now = Date.now();
  // Cutoff 1: Never keep a mood older than 24 hours
  if (now - moodTime >= 24 * 60 * 60 * 1000) {
    return false;
  }

  // Cutoff 2: Reset at 12:00 midnight in user's local or couple timezone
  try {
    const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const moodDay = formatter.format(new Date(moodTime));
    const todayDay = formatter.format(new Date(now));
    return moodDay === todayDay;
  } catch {
    return now - moodTime < 24 * 60 * 60 * 1000;
  }
}

// Milliseconds until 12:00:01 AM midnight in user's or couple's timezone
export function getMsUntilNextMidnight(timeZone?: string): number {
  try {
    const now = new Date();
    const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    const parts = formatter.formatToParts(now);
    let hour = 0;
    let minute = 0;
    let second = 0;
    for (const p of parts) {
      if (p.type === "hour") hour = parseInt(p.value, 10);
      if (p.type === "minute") minute = parseInt(p.value, 10);
      if (p.type === "second") second = parseInt(p.value, 10);
    }
    if (hour === 24) hour = 0;
    const elapsedSeconds = hour * 3600 + minute * 60 + second;
    const secondsInDay = 86400;
    const secondsRemaining = secondsInDay - elapsedSeconds;
    return Math.max(1000, (secondsRemaining + 1.5) * 1000);
  } catch {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);
    return Math.max(1000, nextMidnight.getTime() - now.getTime());
  }
}

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

export type ChallengeHistoryItem = {
  id: string;
  shown_on: string;
  action: "shown" | "saved" | "skipped";
  body: string;
  category: "affection" | "words" | "play" | "reflection" | "service";
  duration_label: string;
  note: string;
  updated_at: string;
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
    `couple_features?select=enabled&couple_id=eq.${encodeURIComponent(couple.couple.id)}&feature_key=eq.daily_question`,
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

export async function submitRevealReaction(
  session: AuthSession | null,
  sessionId: string,
  reaction: string,
  reply?: string,
) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSubmitReaction(reaction, reply);
  await restRpc<null>(
    "submit_reveal_reaction",
    { p_session_id: sessionId, p_reaction: reaction, p_reply: reply || null },
    requireSession(session),
  );
}

// ─── Mood / Emotional Weather ────────────────────────────────────────────────

export async function getMyMood(session: AuthSession | null): Promise<MoodEntry | null> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetMyMood();
  try {
    const auth = requireSession(session);
    const rows = await restGet<MoodEntry[]>(
      `daily_moods?select=*&user_id=eq.${encodeURIComponent(auth.user.id)}&order=updated_at.desc&limit=1`,
      auth,
    );
    const entry = rows[0] ?? null;
    return isMoodFresh(entry) ? entry : null;
  } catch {
    return (await import("./mock")).mockGetMyMood();
  }
}

export async function getPartnerMood(session: AuthSession | null): Promise<MoodEntry | null> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetPartnerMood();
  try {
    const auth = requireSession(session);
    const rows = await restGet<MoodEntry[]>(`partner_mood?select=*&limit=1`, auth);
    const entry = rows[0] ?? null;
    return isMoodFresh(entry) ? entry : null;
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
    return await restRpc<DailyChallenge | null>("get_daily_challenge", {}, requireSession(session));
  } catch {
    return (await import("./mock")).mockGetChallenge();
  }
}

export async function getChallengeStatus(session: AuthSession | null): Promise<{ done: boolean; skipped: boolean; note: string }> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetChallengeStatus();
  try {
    return await restRpc<{ done: boolean; skipped: boolean; note: string }>("get_challenge_status", {}, requireSession(session));
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

export async function skipChallenge(session: AuthSession | null) {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockSkipChallenge();
  try {
    await restRpc<null>("skip_daily_challenge", {}, requireSession(session));
  } catch {
    return (await import("./mock")).mockSkipChallenge();
  }
}

export async function getChallengeHistory(
  session: AuthSession | null,
  limit = 20,
  offset = 0,
): Promise<ChallengeHistoryItem[]> {
  if (!USE_REMOTE_EXTENSIONS || USE_MOCK_API) return (await import("./mock")).mockGetChallengeHistory(limit, offset);
  try {
    return await restRpc<ChallengeHistoryItem[]>(
      "get_challenge_history",
      { p_limit: limit, p_offset: offset },
      requireSession(session),
    );
  } catch {
    return (await import("./mock")).mockGetChallengeHistory(limit, offset);
  }
}
