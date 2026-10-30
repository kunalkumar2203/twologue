import { callRpc, errorMessage } from "@/lib/rpc";
import type { AuthSession } from "@/lib/supabase";

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
