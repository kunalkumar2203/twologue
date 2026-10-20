-- Migration 10: replies on a partner's answer
-- After an answer is revealed, each partner can respond to the OTHER person's answer with
-- an emoji, one short written reply, or both. That is one row per person per answer, so it
-- never turns into a chat.
--
-- This migration does not depend on migration 9. It:
--   1. renames the text column "body" to "reply" (clearer name),
--   2. lets a person edit their own reaction, so they can add a reply after an emoji (or the other way round),
--   3. stops people reacting to their own answer.

begin;

alter table public.response_reactions rename column body to reply;
alter table public.response_reactions
  rename constraint response_reactions_body_check to response_reactions_reply_check;

-- Only the partner's answer can be reacted to (after the reveal, and only within your own couple)
drop policy "response_reactions_insert_own" on public.response_reactions;
create policy "response_reactions_insert_own" on public.response_reactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.responses r
      join public.prompt_instances pi on pi.id = r.instance_id
      where r.id = response_id
        and r.user_id <> (select auth.uid())
        and pi.revealed_at is not null
        and public.is_couple_member(pi.couple_id)
    )
  );

-- You can change your own emoji or reply. Nothing else can be changed, and not other people's.
create policy "response_reactions_update_own" on public.response_reactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant update (emoji, reply) on public.response_reactions to authenticated;

commit;