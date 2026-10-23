-- Migration 11: persistent micro daily challenges

create table public.couple_challenge_days (
  couple_id uuid not null references public.couples (id) on delete cascade,
  for_date date not null,
  content_id uuid not null references public.content_items (id) on delete restrict,
  state text not null default 'open' check (state in ('open', 'done', 'skipped')),
  note text not null default '' check (char_length(note) <= 300),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (couple_id, for_date)
);

create trigger set_updated_at before update on public.couple_challenge_days
  for each row execute function public.set_updated_at();

alter table public.couple_challenge_days enable row level security;
revoke all on public.couple_challenge_days from anon, authenticated;

create policy "challenge_days_select_members" on public.couple_challenge_days
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.couple_challenge_days to authenticated;

insert into public.content_items (ref, type, body, options, tags)
values
  ('ch-001', 'challenge', 'Hold each other for a full 20 seconds: no talking, just presence.', '{"category":"affection","duration_label":"2 min","remote_variant":"Send a voice note saying I love you in three different tones."}', '{daily,affection}'),
  ('ch-002', 'challenge', 'Take turns naming one ordinary thing you are grateful for about today.', '{"category":"words","duration_label":"2 min","remote_variant":"Send each other a photo of one ordinary thing you are grateful for today."}', '{daily,gratitude}'),
  ('ch-003', 'challenge', 'Put on one song and move together until it ends.', '{"category":"play","duration_label":"4 min","remote_variant":"Start the same song and send each other your favorite lyric."}', '{daily,play}'),
  ('ch-004', 'challenge', 'Ask: what felt heavy today, and what would make tonight gentler?', '{"category":"reflection","duration_label":"3 min","remote_variant":"Ask the question in a voice note and give each other time to answer."}', '{daily,reflection}'),
  ('ch-005', 'challenge', 'Do one small helpful thing for your partner before they ask.', '{"category":"service","duration_label":"5 min","remote_variant":"Order or arrange one tiny comfort for your partner from afar."}', '{daily,service}'),
  ('ch-006', 'challenge', 'Look at each other and say one thing you are proud of your partner for.', '{"category":"words","duration_label":"2 min","remote_variant":"Send a short message about something you are proud of in your partner."}', '{daily,affirmation}'),
  ('ch-007', 'challenge', 'Share the funniest small moment you remember from this week.', '{"category":"play","duration_label":"3 min","remote_variant":"Send a funny memory as a voice note with your best dramatic retelling."}', '{daily,memory}'),
  ('ch-008', 'challenge', 'Take three slow breaths together before starting the next thing.', '{"category":"reflection","duration_label":"1 min","remote_variant":"Send a three-breath pause voice note and invite your partner to listen."}', '{daily,presence}'),
  ('ch-009', 'challenge', 'Make your partner a drink and bring it with a sincere thank-you.', '{"category":"service","duration_label":"5 min","remote_variant":"Send a delivery or digital treat with a sincere thank-you."}', '{daily,care}'),
  ('ch-010', 'challenge', 'Hold hands and each name one thing you want more of this week.', '{"category":"affection","duration_label":"3 min","remote_variant":"Send one thing you want more of this week, then ask theirs."}', '{daily,connection}')
on conflict (ref) do nothing;

create or replace function public.get_daily_challenge()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
  v_today date := current_date;
  v_content public.content_items%rowtype;
  v_existing uuid;
  v_enabled boolean := true;
begin
  if v_couple is null then return null; end if;
  select coalesce(cf.enabled, true) into v_enabled
  from public.couple_features cf
  where cf.couple_id = v_couple and cf.feature_key = 'micro_challenges';
  if not coalesce(v_enabled, true) then return null; end if;

  select d.content_id into v_existing
  from public.couple_challenge_days d
  where d.couple_id = v_couple and d.for_date = v_today;

  if v_existing is null then
    select ci.* into v_content
    from public.content_items ci
    where ci.type = 'challenge' and ci.status = 'published'
      and not exists (
        select 1 from public.couple_content_history h
        where h.couple_id = v_couple and h.content_id = ci.id
          and h.content_type = 'challenge' and h.action in ('shown', 'saved', 'skipped')
      )
    order by random()
    limit 1;

    if not found then
      select ci.* into v_content
      from public.content_items ci
      where ci.type = 'challenge' and ci.status = 'published'
      order by random()
      limit 1;
    end if;
    if not found then return null; end if;

    insert into public.couple_challenge_days (couple_id, for_date, content_id)
    values (v_couple, v_today, v_content.id)
    on conflict (couple_id, for_date) do nothing;
    v_existing := v_content.id;

    insert into public.couple_content_history
      (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
    values
      (v_couple, v_content.id, 'challenge', v_content.body, v_today, 'shown', (select auth.uid()));
  end if;

  select ci.* into v_content from public.content_items ci where ci.id = v_existing;
  return jsonb_build_object(
    'id', v_content.ref,
    'title', coalesce(v_content.options ->> 'title', 'A small moment for us'),
    'body', v_content.body,
    'category', coalesce(v_content.options ->> 'category', 'reflection'),
    'remote_variant', coalesce(v_content.options ->> 'remote_variant', v_content.body),
    'duration_label', coalesce(v_content.options ->> 'duration_label', '2 min')
  );
end;
$$;

create or replace function public.get_challenge_status()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'done', coalesce(p.state = 'done', false),
    'skipped', coalesce(p.state = 'skipped', false),
    'note', coalesce(p.note, '')
  )
  from public.couple_challenge_days p
  where p.couple_id = public.my_couple_id() and p.for_date = current_date
  union all
  select jsonb_build_object('done', false, 'skipped', false, 'note', '')
  where not exists (
    select 1 from public.couple_challenge_days p
    where p.couple_id = public.my_couple_id() and p.for_date = current_date
  )
  limit 1;
$$;

create or replace function public.complete_daily_challenge(p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
  v_content uuid;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
begin
  select content_id into v_content from public.couple_challenge_days
  where couple_id = v_couple and for_date = current_date;
  if v_content is null then raise exception 'No challenge is assigned today.'; end if;
  update public.couple_challenge_days
  set state = 'done', note = v_note, updated_by = (select auth.uid())
  where couple_id = v_couple and for_date = current_date;
  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  select v_couple, v_content, 'challenge', ci.body, current_date, 'saved', (select auth.uid())
  from public.content_items ci where ci.id = v_content;
end;
$$;

create or replace function public.skip_daily_challenge()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
  v_content uuid;
begin
  select content_id into v_content from public.couple_challenge_days
  where couple_id = v_couple and for_date = current_date;
  if v_content is null then raise exception 'No challenge is assigned today.'; end if;
  update public.couple_challenge_days
  set state = 'skipped', note = '', updated_by = (select auth.uid())
  where couple_id = v_couple and for_date = current_date;
  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  select v_couple, v_content, 'challenge', ci.body, current_date, 'skipped', (select auth.uid())
  from public.content_items ci where ci.id = v_content;
end;
$$;

grant execute on function public.get_daily_challenge() to authenticated;
grant execute on function public.get_challenge_status() to authenticated;
grant execute on function public.complete_daily_challenge(text) to authenticated;
grant execute on function public.skip_daily_challenge() to authenticated;
