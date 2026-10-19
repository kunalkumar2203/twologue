-- Migration 7: the reveal engine
-- One shared mechanism for "answer privately, reveal together".
-- Used by the daily question and the blind-reveal journal, and ready for later features.
--
-- Reveal rule used here: answers are revealed automatically when both partners have submitted.
-- If either partner passes, nothing is revealed and the prompt is marked skipped.

create table public.prompt_instances (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null check (kind in ('daily_question', 'journal', 'checkin', 'know_me', 'values')),
  content_id uuid references public.content_items (id) on delete set null,
  copied_text text not null,
  for_date date not null,
  status text not null default 'open' check (status in ('open', 'revealed', 'skipped')),
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, kind, for_date),
  constraint prompt_instances_revealed_matches_status check ((status = 'revealed') = (revealed_at is not null))
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.prompt_instances (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '',
  state text not null default 'draft' check (state in ('draft', 'submitted', 'passed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instance_id, user_id),
  constraint responses_submitted_matches_state check ((state = 'draft') = (submitted_at is null))
);

-- One reaction or reply per person, per answer, and only after the reveal
create table public.response_reactions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text check (char_length(emoji) <= 16),
  body text check (char_length(body) <= 500),
  created_at timestamptz not null default now(),
  unique (response_id, user_id),
  constraint response_reactions_has_content check (emoji is not null or body is not null)
);

create trigger set_updated_at before update on public.prompt_instances
  for each row execute function public.set_updated_at();

-- Stamps the submit time, and keeps updated_at right
create or replace function public.responses_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state = 'draft' then
    new.submitted_at := null;
  elsif tg_op = 'INSERT' or old.state = 'draft' then
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger stamp before insert or update on public.responses
  for each row execute function public.responses_stamp();

-- Decides when to reveal. The prompt row is locked first, so two partners
-- submitting at the same moment can't both miss each other.
create or replace function public.responses_reveal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_done int;
  v_submitted int;
begin
  if new.state = 'draft' then return new; end if;

  perform 1 from public.prompt_instances pi where pi.id = new.instance_id for update;

  select count(*) filter (where r.state in ('submitted', 'passed')),
         count(*) filter (where r.state = 'submitted')
    into v_done, v_submitted
  from public.responses r where r.instance_id = new.instance_id;

  if v_done >= 2 then
    if v_submitted >= 2 then
      update public.prompt_instances
        set status = 'revealed', revealed_at = now()
        where id = new.instance_id and status = 'open';
    else
      update public.prompt_instances
        set status = 'skipped'
        where id = new.instance_id and status = 'open';
    end if;
  end if;

  return new;
end;
$$;

create trigger reveal after insert or update of state on public.responses
  for each row execute function public.responses_reveal();

-- "Partner is done / not done yet": shows only that, never any content or drafts
create or replace function public.get_response_status(p_instance_id uuid)
returns table (user_id uuid, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(r.state in ('submitted', 'passed'), false) as done
  from public.prompt_instances pi
  join public.couple_members m on m.couple_id = pi.couple_id and m.left_at is null
  left join public.responses r on r.instance_id = pi.id and r.user_id = m.user_id
  where pi.id = p_instance_id and public.is_couple_member(pi.couple_id);
$$;

revoke execute on function public.responses_stamp() from public, anon, authenticated;
revoke execute on function public.responses_reveal() from public, anon, authenticated;
revoke execute on function public.get_response_status(uuid) from public, anon;
grant execute on function public.get_response_status(uuid) to authenticated;

-- Privacy
alter table public.prompt_instances enable row level security;
alter table public.responses enable row level security;
alter table public.response_reactions enable row level security;

revoke all on public.prompt_instances, public.responses, public.response_reactions from anon, authenticated;

-- Prompts: members can read. Rows are created by functions (daily assignment).
create policy "prompt_instances_select_members" on public.prompt_instances
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.prompt_instances to authenticated;

-- Responses: you always see your own. Your partner's appear only after the reveal.
create policy "responses_select" on public.responses
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.prompt_instances pi
      where pi.id = instance_id and pi.revealed_at is not null and public.is_couple_member(pi.couple_id)
    )
  );
-- You can write only your own answer, and only on an open prompt of your own couple
create policy "responses_insert_own" on public.responses
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.prompt_instances pi
      where pi.id = instance_id and pi.status = 'open' and public.is_couple_member(pi.couple_id)
    )
  );
-- A draft can be edited and submitted. Once submitted, it is locked.
create policy "responses_update_own_draft" on public.responses
  for update to authenticated
  using (user_id = (select auth.uid()) and state = 'draft')
  with check (user_id = (select auth.uid()));
grant select on public.responses to authenticated;
grant insert (instance_id, body, state) on public.responses to authenticated;
grant update (body, state) on public.responses to authenticated;

-- Reactions: visible to the couple after the reveal, and you add or remove your own
create policy "response_reactions_select" on public.response_reactions
  for select to authenticated using (
    exists (
      select 1 from public.responses r
      join public.prompt_instances pi on pi.id = r.instance_id
      where r.id = response_id and pi.revealed_at is not null and public.is_couple_member(pi.couple_id)
    )
  );
create policy "response_reactions_insert_own" on public.response_reactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.responses r
      join public.prompt_instances pi on pi.id = r.instance_id
      where r.id = response_id and pi.revealed_at is not null and public.is_couple_member(pi.couple_id)
    )
  );
create policy "response_reactions_delete_own" on public.response_reactions
  for delete to authenticated using (user_id = (select auth.uid()));
grant select on public.response_reactions to authenticated;
grant insert (response_id, emoji, body) on public.response_reactions to authenticated;
grant delete on public.response_reactions to authenticated;