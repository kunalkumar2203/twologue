import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useSessionMutation } from "@/hooks/use-session-mutation";
import * as api from "./api";
import * as stories from "./stories-api";
import type { StoryKind } from "./stories-api";

const TODAY_KEY = ["journal", "today"];
const REVEALED_KEY = ["journal", "revealed"];
const STORIES_KEY = ["journal", "stories"];
const STARTERS_KEY = ["journal", "starters"];

/* ---------- Write together ---------- */

export function useJournalToday() {
  const { session } = useAuth();
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => api.getJournalToday(session!),
    enabled: Boolean(session),
    // Keep checking while the partner may still be writing
    refetchInterval: (query) => (query.state.data?.status === "open" ? 20_000 : false),
  });
}

export function useRevealedPrompts(kind: api.RevealedKind, limit: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: [...REVEALED_KEY, kind, limit],
    queryFn: () => api.listRevealedPrompts(session!, kind, limit),
    enabled: Boolean(session),
  });
}

export const useSaveJournalDraft = () =>
  useSessionMutation<{ instanceId: string; body: string }, void>((session, args) =>
    api.saveJournalDraft(session, args.instanceId, args.body),
  );

export const useSubmitJournalEntry = () =>
  useSessionMutation<{ instanceId: string; body: string }, void>(
    (session, args) => api.submitJournalEntry(session, args.instanceId, args.body),
    [TODAY_KEY, REVEALED_KEY],
  );

export const usePassJournalPrompt = () =>
  useSessionMutation<{ instanceId: string }, void>(
    (session, args) => api.passJournalPrompt(session, args.instanceId),
    [TODAY_KEY],
  );

export const useReactToEntry = () =>
  useSessionMutation<{ instanceId: string; emoji: string; reply: string | null }, void>(
    (session, args) => api.reactToEntry(session, args.instanceId, args.emoji, args.reply),
    [TODAY_KEY, REVEALED_KEY],
  );

/* ---------- Stories ---------- */

export function useStoryShelf() {
  const { session } = useAuth();
  return useQuery({
    queryKey: STORIES_KEY,
    queryFn: () => stories.getStoryShelf(session!),
    enabled: Boolean(session),
    // While it is the partner's turn, check now and then
    refetchInterval: (query) => (query.state.data?.active?.turn === "partner" ? 20_000 : false),
  });
}

export function useStoryStarters() {
  const { session } = useAuth();
  return useQuery({
    queryKey: STARTERS_KEY,
    queryFn: () => stories.listStoryStarters(session!),
    enabled: Boolean(session),
    staleTime: Infinity,
  });
}

export const useStartStory = () =>
  useSessionMutation<{ title: string; kind: StoryKind; opening: string; starterId: string | null }, string>(
    (session, args) => stories.startStory(session, args),
    [STORIES_KEY],
  );

export const useSaveStoryDraft = () =>
  useSessionMutation<{ storyId: string; body: string }, void>((session, args) =>
    stories.saveStoryDraft(session, args.storyId, args.body),
  );

export const useSubmitStoryParagraph = () =>
  useSessionMutation<{ storyId: string; body: string }, void>(
    (session, args) => stories.submitStoryParagraph(session, args.storyId, args.body),
    [STORIES_KEY],
  );

export const useFinishStory = () =>
  useSessionMutation<{ storyId: string }, void>(
    (session, args) => stories.finishStory(session, args.storyId),
    [STORIES_KEY],
  );

export const useExtendStoryTurn = () =>
  useSessionMutation<{ storyId: string }, void>(
    (session, args) => stories.extendStoryTurn(session, args.storyId),
    [STORIES_KEY],
  );

export const useSurrenderStoryTurn = () =>
  useSessionMutation<{ storyId: string }, void>(
    (session, args) => stories.surrenderStoryTurn(session, args.storyId),
    [STORIES_KEY],
  );
