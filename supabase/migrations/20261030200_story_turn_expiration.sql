-- Migration: Turn expiration grace for alternating stories
-- Adds turn_extended tracking to stories table,
-- and functions to extend turn (max 3 days allowed) or surrender turn to partner.

alter table public.stories
add column if not exists turn_extended boolean not null default false;

-- 1. Extend story turn by 3 days (max 3 days allowed, at most once per turn)
create or replace function public.extend_story_turn(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_story public.stories%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_story from public.stories s
  where s.id = p_story_id and public.is_couple_member(s.couple_id)
  for update;

  if not found or v_story.status <> 'active' then raise exception 'story_closed'; end if;
  if v_story.turn_user_id <> v_user then raise exception 'not_your_turn'; end if;
  if coalesce(v_story.turn_extended, false) then
    raise exception 'turn_already_extended';
  end if;

  -- Max 3 days extension from now
  update public.stories
  set turn_due_at = now() + interval '3 days',
      turn_extended = true
  where id = v_story.id;
end;
$$;

-- 2. Surrender story turn to partner
create or replace function public.surrender_story_turn(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_story public.stories%rowtype;
  v_partner uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_story from public.stories s
  where s.id = p_story_id and public.is_couple_member(s.couple_id)
  for update;

  if not found or v_story.status <> 'active' then raise exception 'story_closed'; end if;
  if v_story.turn_user_id <> v_user then raise exception 'not_your_turn'; end if;

  v_partner := public.my_partner_id();
  if v_partner is null then raise exception 'partner_needed'; end if;

  update public.stories
  set turn_user_id = v_partner,
      turn_started_at = now(),
      turn_due_at = now() + interval '3 days',
      turn_extended = false
  where id = v_story.id;
end;
$$;

-- 3. Reset turn_extended when a new paragraph is submitted
create or replace function public.submit_story_paragraph(p_story_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_story public.stories%rowtype;
  v_text text := btrim(coalesce(p_body, ''));
  v_partner uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  -- Lock the story so two quick taps can't both take the turn
  select * into v_story from public.stories s
  where s.id = p_story_id and public.is_couple_member(s.couple_id)
  for update;
  if not found or v_story.status <> 'active' then raise exception 'story_closed'; end if;
  if v_story.turn_user_id <> v_user then raise exception 'not_your_turn'; end if;
  if char_length(v_text) not between 1 and 1500 then
    raise exception 'Paragraphs need 1 to 1500 characters.';
  end if;

  v_partner := public.my_partner_id();

  insert into public.story_paragraphs (story_id, author_id, position, body)
  values (v_story.id, v_user, v_story.paragraph_count, v_text);

  delete from public.story_drafts where story_id = v_story.id and user_id = v_user;

  update public.stories
  set paragraph_count = paragraph_count + 1,
      turn_user_id = v_partner,
      turn_started_at = now(),
      turn_due_at = now() + interval '3 days',
      turn_extended = false
  where id = v_story.id;
end;
$$;

-- 4. Update story_json to include turn_extended
create or replace function public.story_json(p_story_id uuid, p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'kind', s.kind,
    'status', s.status,
    'paragraph_count', s.paragraph_count,
    'turn', case when s.status = 'active'
                 then (case when s.turn_user_id = p_me then 'me' else 'partner' end) end,
    'turn_due_at', s.turn_due_at,
    'turn_extended', coalesce(s.turn_extended, false),
    'started_at', s.created_at,
    'finished_at', s.finished_at,
    'my_draft', (select d.body from public.story_drafts d where d.story_id = s.id and d.user_id = p_me),
    'paragraphs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'position', sp.position,
        'body', sp.body,
        'opening', sp.author_id is null,
        'is_me', coalesce(sp.author_id = p_me, false),
        'name', case when sp.author_id is null then null
                     when sp.author_id = p_me then 'You'
                     else coalesce(nullif(pr.display_name, ''), 'Your partner') end
      ) order by sp.position), '[]'::jsonb)
      from public.story_paragraphs sp
      left join public.profiles pr on pr.id = sp.author_id
      where sp.story_id = s.id
    )
  )
  from public.stories s
  where s.id = p_story_id;
$$;

revoke execute on function public.extend_story_turn(uuid) from public, anon;
revoke execute on function public.surrender_story_turn(uuid) from public, anon;

grant execute on function public.extend_story_turn(uuid) to authenticated;
grant execute on function public.surrender_story_turn(uuid) to authenticated;
