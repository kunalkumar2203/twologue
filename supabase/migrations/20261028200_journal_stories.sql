-- Journal: alternating story (one paragraph at a time, with a soft turn deadline)

-- 1. Tables 

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null check (kind in ('fiction', 'our_future')),
  starter_id uuid references public.content_items (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'finished')),
  turn_user_id uuid references public.profiles (id) on delete set null,
  turn_started_at timestamptz,
  turn_due_at timestamptz,
  paragraph_count int not null default 0 check (paragraph_count >= 0),
  started_by uuid not null references public.profiles (id) on delete cascade,
  finished_by uuid references public.profiles (id) on delete set null,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_finished_matches_status check ((status = 'finished') = (finished_at is not null)),
  constraint stories_active_has_turn check (status = 'finished' or turn_user_id is not null)
);
-- A couple has at most one story in progress
create unique index stories_one_active_per_couple on public.stories (couple_id) where status = 'active';
create index stories_couple_finished_idx on public.stories (couple_id, finished_at desc);

create trigger set_updated_at before update on public.stories
  for each row execute function public.set_updated_at();

create table public.story_paragraphs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null, -- empty for the opening line
  position int not null check (position >= 0),
  body text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now(),
  unique (story_id, position)
);

-- Unsent paragraphs. Only the person who wrote one can ever read it.
create table public.story_drafts (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1500),
  updated_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create trigger set_updated_at before update on public.story_drafts
  for each row execute function public.set_updated_at();

-- 2. Privacy

alter table public.stories enable row level security;
alter table public.story_paragraphs enable row level security;
alter table public.story_drafts enable row level security;

revoke all on public.stories, public.story_paragraphs, public.story_drafts from anon, authenticated;

create policy "stories_select_members" on public.stories
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.stories to authenticated;

create policy "story_paragraphs_select_members" on public.story_paragraphs
  for select to authenticated using (
    exists (select 1 from public.stories s where s.id = story_id and public.is_couple_member(s.couple_id))
  );
grant select on public.story_paragraphs to authenticated;

create policy "story_drafts_select_own" on public.story_drafts
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.story_drafts to authenticated;

-- 3. Content: story starters (same ids as the dictionary)

insert into public.content_items (ref, type, body, options, tags) values
  ('ss-001', 'story_starter', 'The lighthouse had been dark for forty years, until tonight.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-002', 'story_starter', 'Nobody in the village could explain why the bakery always smelled of rain.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-003', 'story_starter', 'On the last train home, someone had left a small blue suitcase behind.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-004', 'story_starter', 'The old map had one place circled in red, and a note that said, "Wait for me."', '{"kind":"fiction"}', '{fiction}'),
  ('ss-005', 'story_starter', 'When the power went out across the city, the sky finally showed its stars.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-006', 'story_starter', 'The letter was addressed to someone who hadn''t lived in the house for years.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-007', 'story_starter', 'At the edge of the market, a new stall appeared that sold only borrowed memories.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-008', 'story_starter', 'It rained every evening at six, but only on one balcony.', '{"kind":"fiction"}', '{fiction}'),
  ('ss-009', 'story_starter', 'It''s a quiet Sunday, five years from now, and the first thing we notice is…', '{"kind":"our_future"}', '{future}'),
  ('ss-010', 'story_starter', 'We finally move into the home with the window that catches the morning light. The first thing we unpack is…', '{"kind":"our_future"}', '{future}'),
  ('ss-011', 'story_starter', 'On our tenth anniversary, we take the trip we''ve talked about for years. It begins when…', '{"kind":"our_future"}', '{future}'),
  ('ss-012', 'story_starter', 'Somewhere ahead of us there''s a small kitchen, and in it we''re making…', '{"kind":"our_future"}', '{future}'),
  ('ss-013', 'story_starter', 'A year from now we open a box we sealed today. Inside, we find…', '{"kind":"our_future"}', '{future}'),
  ('ss-014', 'story_starter', 'Our favourite evening ritual, years from now, goes like this…', '{"kind":"our_future"}', '{future}')
on conflict (ref) do nothing;

-- 4. Reads 

-- One story with its paragraphs. Drafts are included only for the viewer.
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

-- The story in progress (if any) plus the 20 most recent finished ones
create or replace function public.get_story_shelf()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_active uuid;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'story') then return null; end if;

  select s.id into v_active from public.stories s
  where s.couple_id = v_couple and s.status = 'active';

  return jsonb_build_object(
    'has_partner', public.my_partner_id() is not null,
    'partner_name', coalesce(
      (select nullif(p.display_name, '') from public.profiles p where p.id = public.my_partner_id()),
      'Your partner'),
    'active', case when v_active is null then null else public.story_json(v_active, v_user) end,
    'archive', coalesce((
      select jsonb_agg(a.story order by a.finished_at desc)
      from (
        select s.finished_at, public.story_json(s.id, v_user) as story
        from public.stories s
        where s.couple_id = v_couple and s.status = 'finished'
        order by s.finished_at desc
        limit 20
      ) a
    ), '[]'::jsonb)
  );
end;
$$;

-- 5. Writes 

create or replace function public.start_story(
  p_title text,
  p_kind text,
  p_opening text,
  p_starter_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_partner uuid := public.my_partner_id();
  v_title text := btrim(coalesce(p_title, ''));
  v_opening text := btrim(coalesce(p_opening, ''));
  v_id uuid;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'story') then raise exception 'feature_paused'; end if;
  if v_partner is null then raise exception 'partner_needed'; end if;
  if p_kind not in ('fiction', 'our_future') then raise exception 'invalid_kind'; end if;
  if char_length(v_title) not between 1 and 80 then
    raise exception 'Give the story a title of up to 80 characters.';
  end if;
  if char_length(v_opening) not between 1 and 1500 then
    raise exception 'The opening line needs 1 to 1500 characters.';
  end if;
  if exists (select 1 from public.stories s where s.couple_id = v_couple and s.status = 'active') then
    raise exception 'story_in_progress';
  end if;

  -- The starter's opening line is written by no one; the partner writes the first paragraph
  insert into public.stories
    (couple_id, title, kind, starter_id, status, turn_user_id, turn_started_at, turn_due_at, paragraph_count, started_by)
  values
    (v_couple, v_title, p_kind, p_starter_id, 'active', v_partner, now(), now() + interval '3 days', 1, v_user)
  returning id into v_id;

  insert into public.story_paragraphs (story_id, author_id, position, body)
  values (v_id, null, 0, v_opening);

  return v_id;
end;
$$;

create or replace function public.save_story_draft(p_story_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  perform 1 from public.stories s
  where s.id = p_story_id and s.status = 'active' and public.is_couple_member(s.couple_id);
  if not found then raise exception 'story_closed'; end if;

  insert into public.story_drafts (story_id, user_id, body)
  values (p_story_id, v_user, left(coalesce(p_body, ''), 1500))
  on conflict (story_id, user_id) do update set body = excluded.body, updated_at = now();
end;
$$;

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
      turn_due_at = now() + interval '3 days'
  where id = v_story.id;
end;
$$;

-- Either partner can finish. Unsent drafts are discarded.
create or replace function public.finish_story(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  perform 1 from public.stories s
  where s.id = p_story_id and s.status = 'active' and public.is_couple_member(s.couple_id)
  for update;
  if not found then raise exception 'story_closed'; end if;

  update public.stories
  set status = 'finished', finished_at = now(), finished_by = v_user,
      turn_user_id = null, turn_started_at = null, turn_due_at = null
  where id = p_story_id;

  delete from public.story_drafts where story_id = p_story_id;
end;
$$;

-- 6. Privileges

revoke execute on function public.story_json(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_story_shelf() from public, anon;
revoke execute on function public.start_story(text, text, text, uuid) from public, anon;
revoke execute on function public.save_story_draft(uuid, text) from public, anon;
revoke execute on function public.submit_story_paragraph(uuid, text) from public, anon;
revoke execute on function public.finish_story(uuid) from public, anon;

grant execute on function public.get_story_shelf() to authenticated;
grant execute on function public.start_story(text, text, text, uuid) to authenticated;
grant execute on function public.save_story_draft(uuid, text) to authenticated;
grant execute on function public.submit_story_paragraph(uuid, text) to authenticated;
grant execute on function public.finish_story(uuid) to authenticated;