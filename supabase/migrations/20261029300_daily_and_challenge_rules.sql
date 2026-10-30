-- Daily question and challenge rules that follow the couple's setup.
--   * "Today" is the couple's time zone, not the server's date.
--   * Long-distance couples get the remote version of challenges, and questions tagged
--     long-distance. Other couples do not see those.
--   * The relationship stage nudges questions toward the right tags (new / long-term).
--   * Depth dial: light = light only; mixed = all; deep = deep first, then medium.
--   * Spicy challenges and switched-off challenge categories are left out.
--   * Questions no longer repeat until the pool runs out; then the pool is reused.

-- 1. Helpers

-- The text a couple sees for a challenge: the remote version when they are long distance
create or replace function public.challenge_text(p_body text, p_options jsonb, p_long_distance boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_long_distance and nullif(p_options ->> 'remote_variant', '') is not null
              then p_options ->> 'remote_variant'
              else p_body end;
$$;

-- Picks the next daily question for a couple. Unseen questions come first.
create or replace function public.pick_daily_question(
  p_couple uuid,
  p_depth text,
  p_long_distance boolean,
  p_stage text,
  p_exclude uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_stage_tag text := case p_stage
                        when 'just_started' then 'new-couple'
                        when 'many_years' then 'years-together'
                      end;
begin
  select ci.id into v_id
  from public.content_items ci
  where ci.type = 'daily_question'
    and ci.status = 'published'
    and ci.id is distinct from p_exclude
    and (ci.depth is null
         or (case p_depth
               when 'light' then ci.depth = 'light'
               when 'deep' then ci.depth in ('deep', 'medium')
               else true
             end))
    and (p_long_distance or not ('long-distance' = any(ci.tags)))
  order by
    exists (select 1 from public.couple_content_history h
            where h.couple_id = p_couple and h.content_id = ci.id and h.content_type = 'daily_question'),
    (case when p_depth = 'deep' and ci.depth = 'deep' then 0 else 1 end),
    (case when v_stage_tag is not null and v_stage_tag = any(ci.tags) then 0 else 1 end),
    random()
  limit 1;

  return v_id;
end;
$$;

revoke execute on function public.pick_daily_question(uuid, text, boolean, text, uuid) from public, anon, authenticated;

-- 2. Today's question

create or replace function public.get_today_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_partner uuid := public.my_partner_id();
  v_couple_row public.couples%rowtype;
  v_instance public.prompt_instances%rowtype;
  v_content_id uuid;
  v_my_response public.responses%rowtype;
  v_partner_response public.responses%rowtype;
  v_depth text := 'mixed';
  v_my_name text;
  v_partner_name text;
  v_today date;
  v_days int := 0;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;

  select * into v_couple_row from public.couples c where c.id = v_couple;
  v_today := public.couple_today(v_couple);

  select coalesce(cf.settings ->> 'depth_dial', 'mixed') into v_depth
  from public.couple_features cf
  where cf.couple_id = v_couple and cf.feature_key = 'daily_question';

  select * into v_instance from public.prompt_instances pi
  where pi.couple_id = v_couple and pi.kind = 'daily_question' and pi.for_date = v_today;

  if not found then
    v_content_id := public.pick_daily_question(
      v_couple, v_depth, v_couple_row.is_long_distance, v_couple_row.relationship_stage, null);
    if v_content_id is null then raise exception 'no_daily_question'; end if;

    insert into public.prompt_instances (couple_id, kind, content_id, copied_text, for_date)
    select v_couple, 'daily_question', ci.id, ci.body, v_today
    from public.content_items ci
    where ci.id = v_content_id
    on conflict (couple_id, kind, for_date) do nothing
    returning * into v_instance;

    if found then
      insert into public.couple_content_history
        (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
      values (v_couple, v_content_id, 'daily_question', v_instance.copied_text, v_today, 'shown', v_user);
    else
      -- The partner opened the screen at the same moment and created today's question first
      select * into v_instance from public.prompt_instances pi
      where pi.couple_id = v_couple and pi.kind = 'daily_question' and pi.for_date = v_today;
    end if;
  end if;

  select p.display_name into v_my_name from public.profiles p where p.id = v_user;
  select p.display_name into v_partner_name from public.profiles p where p.id = v_partner;
  select * into v_my_response from public.responses r where r.instance_id = v_instance.id and r.user_id = v_user;
  select * into v_partner_response from public.responses r where r.instance_id = v_instance.id and r.user_id = v_partner;

  select count(*) into v_days from public.prompt_instances pi
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
    'my_reaction', (select rr.emoji from public.response_reactions rr
                    where rr.response_id = v_partner_response.id and rr.user_id = v_user),
    'my_reply', (select rr.reply from public.response_reactions rr
                 where rr.response_id = v_partner_response.id and rr.user_id = v_user),
    'partner_reaction', (select rr.emoji from public.response_reactions rr
                         where rr.response_id = v_my_response.id and rr.user_id <> v_user),
    'partner_reply', (select rr.reply from public.response_reactions rr
                      where rr.response_id = v_my_response.id and rr.user_id <> v_user),
    'days_answered_together', v_days,
    'swap_used_today', exists (
      select 1 from public.couple_content_history h
      where h.couple_id = v_couple and h.content_type = 'daily_question'
        and h.shown_on = v_today and h.action = 'swapped'),
    'depth_dial', case when v_depth in ('light', 'mixed', 'deep') then v_depth else 'mixed' end
  );
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
  v_couple_row public.couples%rowtype;
  v_depth text := 'mixed';
  v_today date;
  v_new uuid;
  v_body text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_instance from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if not found or v_instance.status <> 'open' then raise exception 'daily_question_closed'; end if;
  if exists (select 1 from public.responses r where r.instance_id = v_instance.id and r.state <> 'draft') then
    raise exception 'You cannot swap after saving an answer.';
  end if;

  v_today := public.couple_today(v_instance.couple_id);
  if exists (
    select 1 from public.couple_content_history h
    where h.couple_id = v_instance.couple_id and h.content_type = 'daily_question'
      and h.shown_on = v_today and h.action = 'swapped'
  ) then
    raise exception 'You have already swapped today''s question.';
  end if;

  select * into v_couple_row from public.couples c where c.id = v_instance.couple_id;
  select coalesce(cf.settings ->> 'depth_dial', 'mixed') into v_depth
  from public.couple_features cf
  where cf.couple_id = v_instance.couple_id and cf.feature_key = 'daily_question';

  v_new := public.pick_daily_question(
    v_instance.couple_id, v_depth, v_couple_row.is_long_distance, v_couple_row.relationship_stage,
    v_instance.content_id);
  if v_new is null then raise exception 'No alternate question is available.'; end if;

  select ci.body into v_body from public.content_items ci where ci.id = v_new;

  update public.prompt_instances set content_id = v_new, copied_text = v_body where id = v_instance.id;
  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  values (v_instance.couple_id, v_new, 'daily_question', v_body, v_today, 'swapped', v_user);
end;
$$;

-- 3. Micro challenges

create or replace function public.get_daily_challenge()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
  v_settings jsonb := '{}'::jsonb;
  v_spicy boolean := false;
  v_disabled text[] := '{}'::text[];
  v_long_distance boolean := false;
  v_content public.content_items%rowtype;
  v_existing uuid;
begin
  if v_user is null or v_couple is null then return null; end if;
  if not public.is_feature_enabled(v_couple, 'micro_challenges') then return null; end if;

  v_today := public.couple_today(v_couple);

  select coalesce(cf.settings, '{}'::jsonb) into v_settings
  from public.couple_features cf
  where cf.couple_id = v_couple and cf.feature_key = 'micro_challenges';
  v_spicy := coalesce((v_settings ->> 'spicy')::boolean, false);
  v_disabled := coalesce(
    array(select jsonb_array_elements_text(coalesce(v_settings -> 'disabled_categories', '[]'::jsonb))),
    '{}'::text[]);

  select c.is_long_distance into v_long_distance from public.couples c where c.id = v_couple;

  select d.content_id into v_existing from public.couple_challenge_days d
  where d.couple_id = v_couple and d.for_date = v_today;

  if v_existing is null then
    select ci.* into v_content from public.content_items ci
    where ci.type = 'challenge' and ci.status = 'published'
      and (v_spicy or not ci.spicy)
      and not (coalesce(ci.options ->> 'category', '') = any(v_disabled))
    order by
      exists (select 1 from public.couple_content_history h
              where h.couple_id = v_couple and h.content_id = ci.id and h.content_type = 'challenge'
                and h.action in ('shown', 'saved', 'skipped')),
      random()
    limit 1;
    if not found then return null; end if;

    insert into public.couple_challenge_days (couple_id, for_date, content_id)
    values (v_couple, v_today, v_content.id)
    on conflict (couple_id, for_date) do nothing
    returning content_id into v_existing;

    if found then
      insert into public.couple_content_history
        (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
      values (v_couple, v_content.id, 'challenge',
              public.challenge_text(v_content.body, v_content.options, v_long_distance),
              v_today, 'shown', v_user);
    else
      select d.content_id into v_existing from public.couple_challenge_days d
      where d.couple_id = v_couple and d.for_date = v_today;
    end if;
  end if;

  select ci.* into v_content from public.content_items ci where ci.id = v_existing;

  return jsonb_build_object(
    'id', v_content.ref,
    'title', coalesce(v_content.options ->> 'title', 'A small moment for us'),
    'body', public.challenge_text(v_content.body, v_content.options, v_long_distance),
    'category', coalesce(v_content.options ->> 'category', 'reflection'),
    'remote_variant', coalesce(nullif(v_content.options ->> 'remote_variant', ''), v_content.body),
    'is_remote', v_long_distance and nullif(v_content.options ->> 'remote_variant', '') is not null,
    'long_distance', v_long_distance,
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
  select coalesce(
    (select jsonb_build_object(
              'done', p.state = 'done',
              'skipped', p.state = 'skipped',
              'note', coalesce(p.note, ''))
     from public.couple_challenge_days p
     where p.couple_id = public.my_couple_id()
       and p.for_date = public.couple_today(public.my_couple_id())),
    jsonb_build_object('done', false, 'skipped', false, 'note', '')
  );
$$;

create or replace function public.complete_daily_challenge(p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
  v_row public.couple_challenge_days%rowtype;
  v_content public.content_items%rowtype;
  v_long_distance boolean := false;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;

  v_today := public.couple_today(v_couple);
  select * into v_row from public.couple_challenge_days d
  where d.couple_id = v_couple and d.for_date = v_today;
  if not found then raise exception 'No challenge is assigned today.'; end if;

  select * into v_content from public.content_items ci where ci.id = v_row.content_id;
  select c.is_long_distance into v_long_distance from public.couples c where c.id = v_couple;

  update public.couple_challenge_days d set
    state = 'done', note = left(btrim(coalesce(p_note, '')), 300), updated_by = v_user
  where d.couple_id = v_couple and d.for_date = v_today;

  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  values (v_couple, v_content.id, 'challenge',
          public.challenge_text(v_content.body, v_content.options, v_long_distance),
          v_today, 'saved', v_user);
end;
$$;

create or replace function public.skip_daily_challenge()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
  v_row public.couple_challenge_days%rowtype;
  v_content public.content_items%rowtype;
  v_long_distance boolean := false;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;

  v_today := public.couple_today(v_couple);
  select * into v_row from public.couple_challenge_days d
  where d.couple_id = v_couple and d.for_date = v_today;
  if not found then raise exception 'No challenge is assigned today.'; end if;

  select * into v_content from public.content_items ci where ci.id = v_row.content_id;
  select c.is_long_distance into v_long_distance from public.couples c where c.id = v_couple;

  update public.couple_challenge_days d set state = 'skipped', note = '', updated_by = v_user
  where d.couple_id = v_couple and d.for_date = v_today;

  insert into public.couple_content_history
    (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
  values (v_couple, v_content.id, 'challenge',
          public.challenge_text(v_content.body, v_content.options, v_long_distance),
          v_today, 'skipped', v_user);
end;
$$;

-- 4. Privileges (existing functions keep their grants; new helpers stay internal)
revoke execute on function public.challenge_text(text, jsonb, boolean) from public, anon, authenticated;
