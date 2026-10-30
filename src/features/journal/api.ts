import { callRpc, errorMessage } from "@/lib/rpc";
import { restGet, type AuthSession } from "@/lib/supabase";

export type EntryState = "none" | "draft" | "submitted" | "passed";

export type JournalEntry = {
  response_id: string;
  is_me: boolean;
  name: string;
  body: string;
  reaction: string | null;
  reply: string | null;
  reaction_is_mine: boolean | null;
};

export type JournalToday = {
  instance_id: string;
  for_date: string;
  prompt: string;
  status: "open" | "revealed" | "skipped";
  my_state: EntryState;
  my_body: string | null;
  partner_name: string;
  partner_state: "waiting" | "done" | "passed";
  entries: JournalEntry[];
  pages_written: number;
};

export type RevealedPage = {
  instance_id: string;
  for_date: string;
  prompt: string;
  revealed_at: string;
  entries: JournalEntry[];
};

export type RevealedKind = "journal" | "daily_question";

const JOURNAL_MESSAGES: Record<string, string> = {
  journal_closed: "This prompt has closed. A new one arrives tomorrow.",
  entry_locked: "Your entry is locked now. It opens up once you're both done.",
  no_journal_prompt: "No prompts are available yet. Please check back soon.",
  invalid_kind: "That archive isn't available.",
};

export const journalMessage = (error: unknown) => errorMessage(error, JOURNAL_MESSAGES);

export const getJournalToday = (session: AuthSession) =>
  callRpc<JournalToday | null>(session, "get_journal_today");

export const saveJournalDraft = (session: AuthSession, instanceId: string, body: string) =>
  callRpc<void>(session, "save_journal_draft", { p_instance_id: instanceId, p_body: body });

export const submitJournalEntry = (session: AuthSession, instanceId: string, body: string) =>
  callRpc<void>(session, "submit_journal_entry", { p_instance_id: instanceId, p_body: body });

export const passJournalPrompt = (session: AuthSession, instanceId: string) =>
  callRpc<void>(session, "pass_journal_prompt", { p_instance_id: instanceId });

// Shared reaction function: one emoji and/or one short reply per person
export const reactToEntry = (session: AuthSession, instanceId: string, emoji: string, reply: string | null) =>
  callRpc<void>(session, "submit_reveal_reaction", {
    p_session_id: instanceId,
    p_reaction: emoji,
    p_reply: reply,
  });

// Revealed answers, newest first. Used by "Our answers" (daily) and "Our pages" (journal).
export const listRevealedPrompts = (session: AuthSession, kind: RevealedKind, limit: number, offset = 0) =>
  callRpc<RevealedPage[]>(session, "list_revealed_prompts", { p_kind: kind, p_limit: limit, p_offset: offset });

export type DailyQuestionHistoryItem = {
  instance_id: string;
  for_date: string;
  prompt: string;
  status: "revealed" | "skipped";
  revealed_at: string | null;
  entries: JournalEntry[];
};

export async function getDailyQuestionHistory(
  session: AuthSession,
  limit = 50,
  offset = 0,
): Promise<DailyQuestionHistoryItem[]> {
  // 1. Try dedicated RPC if migration 20261030300 has been run
  try {
    const rpcResult = await callRpc<DailyQuestionHistoryItem[]>(
      session,
      "list_daily_question_history",
      { p_limit: limit, p_offset: offset },
    );
    if (Array.isArray(rpcResult)) {
      return rpcResult;
    }
  } catch {
    // Fallback gracefully below
  }

  // 2. Fallback: query revealed via listRevealedPrompts + unrevealed via restGet
  try {
    const revealed = await listRevealedPrompts(session, "daily_question", limit, offset);
    const revealedItems: DailyQuestionHistoryItem[] = (revealed ?? []).map((page) => ({
      instance_id: page.instance_id,
      for_date: page.for_date,
      prompt: page.prompt,
      status: "revealed" as const,
      revealed_at: page.revealed_at,
      entries: page.entries ?? [],
    }));

    const revealedIds = new Set(revealedItems.map((r) => r.instance_id));

    // Get non-revealed prompt instances
    const nowIso = new Date().toISOString().slice(0, 10);
    const unrevealedRows = await restGet<
      Array<{
        id: string;
        for_date: string;
        copied_text: string;
        status: string;
        revealed_at: string | null;
      }>
    >(
      `prompt_instances?kind=eq.daily_question&status=neq.revealed&order=for_date.desc&limit=${limit}`,
      session,
    );

    const skippedItems: DailyQuestionHistoryItem[] = (unrevealedRows ?? [])
      .filter((row) => {
        if (revealedIds.has(row.id)) return false;
        // If explicitly marked skipped
        if (row.status === "skipped") return true;
        // If open but from a past date, it expired -> skipped
        if (row.status === "open" && row.for_date < nowIso) return true;
        // Today's open question is still active on Today page
        return false;
      })
      .map((row) => ({
        instance_id: row.id,
        for_date: row.for_date,
        prompt: row.copied_text,
        status: "skipped" as const,
        revealed_at: null,
        entries: [],
      }));

    const combined = [...revealedItems, ...skippedItems].sort(
      (a, b) => new Date(b.for_date).getTime() - new Date(a.for_date).getTime(),
    );
    return combined;
  } catch {
    const revealed = await listRevealedPrompts(session, "daily_question", limit, offset);
    return (revealed ?? []).map((page) => ({
      instance_id: page.instance_id,
      for_date: page.for_date,
      prompt: page.prompt,
      status: "revealed" as const,
      revealed_at: page.revealed_at,
      entries: page.entries ?? [],
    }));
  }
}
