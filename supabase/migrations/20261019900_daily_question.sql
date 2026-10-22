-- Migration : persistent daily question flow
-- The app-facing functions in this migration keep prompt assignment and reveal state atomic.

alter table public.responses
  add column if not exists reveal_requested boolean not null default false;

-- The daily question has an explicit two-person reveal choice. The original generic
-- trigger revealed prompts as soon as both responses were submitted.
create or replace function public.responses_reveal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_done int;
  v_submitted int;
  v_requested int;
  v_passed int;
begin
  perform 1 from public.prompt_instances pi where pi.id = new.instance_id for update;

  select count(*) filter (where r.state in ('submitted', 'passed')),
         count(*) filter (where r.state = 'submitted'),
         count(*) filter (where r.reveal_requested),
         count(*) filter (where r.state = 'passed')
    into v_done, v_submitted, v_requested, v_passed
  from public.responses r
  where r.instance_id = new.instance_id;

  if v_done >= 2 then
    if v_passed > 0 then
      update public.prompt_instances
        set status = 'skipped'
        where id = new.instance_id and status = 'open';
    elsif v_submitted >= 2 and v_requested >= 2 then
      update public.prompt_instances
        set status = 'revealed', revealed_at = now()
        where id = new.instance_id and status = 'open';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reveal on public.responses;
create trigger reveal
  after insert or update of state, reveal_requested on public.responses
  for each row execute function public.responses_reveal();

-- A small initial library keeps a new installation usable. More launch content can
-- be added with the same stable ref values without changing the app.
insert into public.content_items (ref, type, body, depth, tags)
values
  ('dq-001', 'daily_question', 'What is one small moment when you feel most loved by me?', 'light', '{daily,affection}'),
  ('dq-002', 'daily_question', 'What is something ordinary about us that you hope we never take for granted?', 'medium', '{daily,gratitude}'),
  ('dq-003', 'daily_question', 'What helps you feel safe enough to be completely honest with me?', 'deep', '{daily,trust}'),
  ('dq-004', 'daily_question', 'What made you smile today that you have not told me about yet?', 'light', '{daily,joy}'),
  ('dq-005', 'daily_question', 'Which little ritual of ours makes a day feel like ours?', 'medium', '{daily,ritual}'),
  ('dq-006', 'daily_question', 'What part of yourself do you want more room for in this season of our relationship?', 'deep', '{daily,growth}'),
  ('dq-007', 'daily_question', 'What is one thing I did recently that made your day easier?', 'light', '{daily,appreciation}'),
  ('dq-008', 'daily_question', 'When do you feel most like a team with me?', 'medium', '{daily,partnership}'),
  ('dq-009', 'daily_question', 'What truth about yourself are you learning to let me see?', 'deep', '{daily,vulnerability}'),
  ('dq-010', 'daily_question', 'What would make tonight feel especially kind to both of us?', 'light', '{daily,care}'),
  ('dq-011', 'daily_question', 'What is a memory of us that still gives you energy?', 'medium', '{daily,memory}'),
  ('dq-012', 'daily_question', 'What do you want us to protect when life gets especially busy?', 'deep', '{daily,priorities}')
on conflict (ref) do nothing;

create or replace function public.get_today_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_instance public.prompt_instances%rowtype;
  v_my_response public.responses%rowtype;
  v_partner_response public.responses%rowtype;
  v_depth text := 'mixed';
  v_my_name text := 'You';
  v_partner_name text := 'Your partner';
  v_today date := current_date;
  v_days int := 0;
begin
  if v_user is null or v_couple is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(cf.settings ->> 'depth_dial', 'mixed')
    into v_depth
  from public.couple_features cf
  where cf.couple_id = v_couple and cf.feature_key = 'daily_question';

  select * into v_instance
  from public.prompt_instances pi
  where pi.couple_id = v_couple and pi.kind = 'daily_question' and pi.for_date = v_today;

  if not found then
    insert into public.prompt_instances (couple_id, kind, content_id, copied_text, for_date)
    select v_couple, 'daily_question', ci.id, ci.body, v_today
    from public.content_items ci
    where ci.type = 'daily_question'
      and ci.status = 'published'
      and (v_depth = 'mixed' or ci.depth = v_depth or ci.depth is null)
      and not exists (
        select 1 from public.couple_content_history h
        where h.couple_id = v_couple
          and h.content_id = ci.id
          and h.content_type = 'daily_question'
          and h.shown_on = v_today
      )
    order by random()
    limit 1
    returning * into v_instance;

    if not found then
      raise exception 'no_daily_question';
    end if;

    insert into public.couple_content_history
      (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
    values
      (v_couple, v_instance.content_id, 'daily_question', v_instance.copied_text, v_today, 'shown', v_user);
  end if;

  select p.display_name into v_my_name
  from public.profiles p where p.id = v_user;

  select p.display_name into v_partner_name
  from public.couple_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.couple_id = v_couple and cm.user_id <> v_user and cm.left_at is null;

  select * into v_my_response from public.responses r
  where r.instance_id = v_instance.id and r.user_id = v_user;

  select * into v_partner_response from public.responses r
  where r.instance_id = v_instance.id and r.user_id <> v_user;

  select count(*) into v_days
  from public.prompt_instances pi
  where pi.couple_id = v_couple and pi.kind = 'daily_question' and pi.status = 'revealed';

  return jsonb_build_object(
    'session_id', v_instance.id,
    'local_date', v_instance.for_date,
    'prompt', v_instance.copied_text,
    'status', v_instance.status,
    'revealed', v_instance.status = 'revealed',
    'revealed_at', v_instance.revealed_at,
    'my_name', coalesce(nullif(v_my_name, ''), 'You'),
    'partner_name', coalesce(nullif(v_partner_name, ''), 'Your partner'),
    'my_answer', v_my_response.body,
    'partner_answer', case when v_instance.status = 'revealed' then v_partner_response.body else null end,
    'my_answered', coalesce(v_my_response.state in ('submitted', 'passed'), false),
    'partner_answered', coalesce(v_partner_response.state in ('submitted', 'passed'), false),
    'my_reveal_requested', coalesce(v_my_response.reveal_requested, false),
    'partner_reveal_requested', coalesce(v_partner_response.reveal_requested, false),
    'my_reaction', (select rr.emoji from public.response_reactions rr where rr.response_id = v_my_response.id and rr.user_id = v_user),
    'partner_reaction', (select rr.emoji from public.response_reactions rr where rr.response_id = v_partner_response.id and rr.user_id <> v_user),
    'days_answered_together', v_days,
    'swap_used_today', exists (
      select 1 from public.couple_content_history h
      where h.couple_id = v_couple and h.content_type = 'daily_question'
        and h.shown_on = v_today and h.action = 'swapped'
    ),
    'depth_dial', case when v_depth in ('light', 'mixed', 'deep') then v_depth else 'mixed' end
  );
end;
$$;

create or replace function public.submit_daily_answer(p_session_id uuid, p_answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_instance public.prompt_instances%rowtype;
  v_text text := btrim(coalesce(p_answer, ''));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if char_length(v_text) < 1 or char_length(v_text) > 2000 then
    raise exception 'Answers need 1 to 2000 characters.';
  end if;

  select * into v_instance from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if not found or v_instance.status <> 'open' then raise exception 'daily_question_closed'; end if;

  insert into public.responses (instance_id, user_id, body, state, reveal_requested)
  values (v_instance.id, v_user, v_text, 'submitted', false)
  on conflict (instance_id, user_id) do update
    set body = excluded.body, state = 'submitted', reveal_requested = false;
end;
$$;

create or replace function public.request_daily_reveal(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_status text;
  v_state text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select pi.status into v_status from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if v_status is null then raise exception 'daily_question_not_found'; end if;
  if v_status = 'revealed' then return true; end if;

  select r.state into v_state from public.responses r
  where r.instance_id = p_session_id and r.user_id = v_user;
  if v_state <> 'submitted' then raise exception 'Save your answer before asking to reveal.'; end if;

  update public.responses set reveal_requested = true
  where instance_id = p_session_id and user_id = v_user;

  select pi.status into v_status from public.prompt_instances pi where pi.id = p_session_id;
  return v_status = 'revealed';
end;
$$;

create or replace function public.swap_daily_question(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_instance public.prompt_instances%rowtype;
  v_content public.content_items%rowtype;
  v_today date := current_date;
begin
  select * into v_instance from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if not found or v_instance.status <> 'open' then raise exception 'daily_question_closed'; end if;
  if exists (select 1 from public.responses r where r.instance_id = v_instance.id and r.state <> 'draft') then
    raise exception 'You cannot swap after saving an answer.';
  end if;
  if exists (
    select 1 from public.couple_content_history h
    where h.couple_id = v_instance.couple_id and h.content_type = 'daily_question'
      and h.shown_on = v_today and h.action = 'swapped'
  ) then raise exception 'You have already swapped today''s question.'; end if;

  select ci.* into v_content
  from public.content_items ci
  where ci.type = 'daily_question' and ci.status = 'published' and ci.id <> v_instance.content_id
    and not exists (
      select 1 from public.couple_content_history h
      where h.couple_id = v_instance.couple_id and h.content_id = ci.id
        and h.content_type = 'daily_question' and h.shown_on = v_today
    )
  order by random() limit 1;
  if not found then raise exception 'No alternate question is available.'; end if;

  update public.prompt_instances
  set content_id = v_content.id, copied_text = v_content.body
  where id = v_instance.id;

  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  values
    (v_instance.couple_id, v_content.id, 'daily_question', v_content.body, v_today, 'swapped', v_user);
end;
$$;

create or replace function public.submit_reveal_reaction(p_session_id uuid, p_reaction text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_response uuid;
  v_status text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select pi.status into v_status from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if v_status <> 'revealed' then raise exception 'Answers haven''t been revealed yet.'; end if;
  select r.id into v_response from public.responses r where r.instance_id = p_session_id and r.user_id <> v_user;
  if v_response is null then raise exception 'Partner answer not found.'; end if;
  if exists (select 1 from public.response_reactions rr where rr.response_id = v_response and rr.user_id = v_user) then
    raise exception 'You have already reacted.';
  end if;
  insert into public.response_reactions (response_id, user_id, emoji) values (v_response, v_user, left(btrim(p_reaction), 16));
end;
$$;

grant execute on function public.get_today_state() to authenticated;
grant execute on function public.submit_daily_answer(uuid, text) to authenticated;
grant execute on function public.request_daily_reveal(uuid) to authenticated;
grant execute on function public.swap_daily_question(uuid) to authenticated;
grant execute on function public.submit_reveal_reaction(uuid, text) to authenticated;
