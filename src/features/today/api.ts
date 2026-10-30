import { getCoupleSetup } from "@/features/couples/setup-api";
import { callRpc } from "@/lib/rpc";
import { restGet, type AuthSession } from "@/lib/supabase";

// Every read and write goes to the database. The offline mock was removed, so a failure is shown, never faked.

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
export type ChallengeCategory = "affection" | "words" | "play" | "reflection" | "service";

export type DailyChallenge = {
  id: string;
  title: string;
  body: string;
  category: ChallengeCategory;
  remote_variant: string;
  duration_label: string;
  is_remote?: boolean;
  long_distance?: boolean;
};

export type ChallengeHistoryItem = {
  id: string;
  shown_on: string;
  action: "shown" | "saved" | "skipped";
  body: string;
  category: ChallengeCategory;
  duration_label: string;
  note: string;
  updated_at: string;
};

function requireSession(session: AuthSession | null) {
  if (!session) throw new Error("Please sign in again.");
  return session;
}

// ─── Daily question ─────────────────────────────────────────────────────────

export async function getTodayScreen(session: AuthSession | null): Promise<TodayScreen> {
  const auth = requireSession(session);
  const setup = await getCoupleSetup(auth);
  if (!setup?.partner) return { kind: "no-couple" };
  if (setup.features.find((item) => item.key === "daily_question")?.enabled === false) {
    return { kind: "paused" };
  }
  return { kind: "ready", state: await callRpc<TodayState>(auth, "get_today_state") };
}

export async function submitDailyAnswer(session: AuthSession | null, sessionId: string, answer: string) {
  await callRpc<void>(requireSession(session), "submit_daily_answer", { p_session_id: sessionId, p_answer: answer });
}

// True when this request completed the reveal for both partners
export function requestDailyReveal(session: AuthSession | null, sessionId: string) {
  return callRpc<boolean>(requireSession(session), "request_daily_reveal", { p_session_id: sessionId });
}

export async function swapDailyQuestion(session: AuthSession | null, sessionId: string) {
  await callRpc<void>(requireSession(session), "swap_daily_question", { p_session_id: sessionId });
}

export async function submitRevealReaction(
  session: AuthSession | null,
  sessionId: string,
  reaction: string,
  reply?: string,
) {
  await callRpc<void>(requireSession(session), "submit_reveal_reaction", {
    p_session_id: sessionId,
    p_reaction: reaction,
    p_reply: reply || null,
  });
}

// ─── Mood / emotional weather ───────────────────────────────────────────────

export async function getMyMood(session: AuthSession | null): Promise<MoodEntry | null> {
  const auth = requireSession(session);
  const rows = await restGet<MoodEntry[]>(
    `daily_moods?select=*&user_id=eq.${encodeURIComponent(auth.user.id)}&order=updated_at.desc&limit=1`,
    auth,
  );
  const entry = rows[0] ?? null;
  return isMoodFresh(entry) ? entry : null;
}

export async function getPartnerMood(session: AuthSession | null): Promise<MoodEntry | null> {
  const auth = requireSession(session);
  const rows = await restGet<MoodEntry[]>("partner_mood?select=*&limit=1", auth);
  const entry = rows[0] ?? null;
  return isMoodFresh(entry) ? entry : null;
}

export async function setMyMood(session: AuthSession | null, entry: Omit<MoodEntry, "id" | "created_at">) {
  await callRpc<void>(requireSession(session), "set_my_mood", {
    p_icon: entry.icon,
    p_label: entry.label,
    p_note: entry.note,
    p_private: entry.private,
  });
}

export async function clearMyMood(session: AuthSession | null) {
  await callRpc<void>(requireSession(session), "clear_my_mood");
}

// ─── Appreciation notes ─────────────────────────────────────────────────────

export const getReceivedNotes = (session: AuthSession | null) =>
  callRpc<AppreciationNote[]>(requireSession(session), "get_appreciation_notes", { p_scope: "received" });

export const getSentNotes = (session: AuthSession | null) =>
  callRpc<AppreciationNote[]>(requireSession(session), "get_appreciation_notes", { p_scope: "sent" });

export async function sendAppreciationNote(
  session: AuthSession | null,
  note: { template: string; body: string; emoji?: string },
) {
  await callRpc<void>(requireSession(session), "send_appreciation_note", {
    p_template: note.template,
    p_body: note.body,
    p_emoji: note.emoji ?? null,
    p_photo_path: null,
  });
}

export async function markNoteRead(session: AuthSession | null, noteId: string) {
  await callRpc<void>(requireSession(session), "mark_appreciation_note_read", { p_note_id: noteId });
}

// ─── Micro daily challenge ──────────────────────────────────────────────────

export const getDailyChallenge = (session: AuthSession | null) =>
  callRpc<DailyChallenge | null>(requireSession(session), "get_daily_challenge");

export const getChallengeStatus = (session: AuthSession | null) =>
  callRpc<{ done: boolean; skipped: boolean; note: string }>(requireSession(session), "get_challenge_status");

export async function completeChallenge(session: AuthSession | null, note: string) {
  await callRpc<void>(requireSession(session), "complete_daily_challenge", { p_note: note });
}

export async function skipChallenge(session: AuthSession | null) {
  await callRpc<void>(requireSession(session), "skip_daily_challenge");
}

export const getChallengeHistory = (session: AuthSession | null, limit = 20, offset = 0) =>
  callRpc<ChallengeHistoryItem[]>(requireSession(session), "get_challenge_history", {
    p_limit: limit,
    p_offset: offset,
  });
