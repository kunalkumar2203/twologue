import { restGet, type AuthSession } from "@/lib/supabase";
import { callRpc, errorMessage } from "@/lib/rpc";

export type StoryKind = "fiction" | "our_future";

export type StoryParagraph = {
  position: number;
  body: string;
  opening: boolean;
  is_me: boolean;
  name: string | null;
};

export type Story = {
  id: string;
  title: string;
  kind: StoryKind;
  status: "active" | "finished";
  paragraph_count: number;
  turn: "me" | "partner" | null;
  turn_due_at: string | null;
  turn_extended?: boolean;
  started_at: string;
  finished_at: string | null;
  my_draft: string | null;
  paragraphs: StoryParagraph[];
};

export type StoryShelf = {
  has_partner: boolean;
  partner_name: string;
  active: Story | null;
  archive: Story[];
};

export type StoryStarter = {
  id: string;
  body: string;
  options: { kind?: StoryKind };
};

const STORY_MESSAGES: Record<string, string> = {
  story_closed: "This story has already been finished.",
  not_your_turn: "It's not your turn yet. Your draft is safe.",
  story_in_progress: "You already have a story in progress. Finish it first.",
  partner_needed: "Invite your partner before starting a story together.",
  invalid_kind: "Pick fiction or our future to begin.",
  turn_already_extended: "This turn has already been extended by 3 days.",
};

export const storyMessage = (error: unknown) => errorMessage(error, STORY_MESSAGES);

export const getStoryShelf = (session: AuthSession) => callRpc<StoryShelf | null>(session, "get_story_shelf");

// Published starters, read directly (the table is readable by signed-in people)
export const listStoryStarters = (session: AuthSession) =>
  restGet<StoryStarter[]>(
    "content_items?select=id,body,options&type=eq.story_starter&status=eq.published&order=ref.asc",
    session,
  );

export const startStory = (
  session: AuthSession,
  input: { title: string; kind: StoryKind; opening: string; starterId: string | null },
) =>
  callRpc<string>(session, "start_story", {
    p_title: input.title,
    p_kind: input.kind,
    p_opening: input.opening,
    p_starter_id: input.starterId,
  });

export const saveStoryDraft = (session: AuthSession, storyId: string, body: string) =>
  callRpc<void>(session, "save_story_draft", { p_story_id: storyId, p_body: body });

export const submitStoryParagraph = (session: AuthSession, storyId: string, body: string) =>
  callRpc<void>(session, "submit_story_paragraph", { p_story_id: storyId, p_body: body });

export const finishStory = (session: AuthSession, storyId: string) =>
  callRpc<void>(session, "finish_story", { p_story_id: storyId });

export const extendStoryTurn = (session: AuthSession, storyId: string) =>
  callRpc<void>(session, "extend_story_turn", { p_story_id: storyId });

export const surrenderStoryTurn = (session: AuthSession, storyId: string) =>
  callRpc<void>(session, "surrender_story_turn", { p_story_id: storyId });

