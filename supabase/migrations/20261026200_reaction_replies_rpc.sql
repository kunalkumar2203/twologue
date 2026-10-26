-- Migration: Written replies support for reactions
-- Updates submit_reveal_reaction to accept an optional reply (up to 280 chars) and support upsert/edit
-- Updates get_today_state to return my_reply and partner_reply

create or replace function public.submit_reveal_reaction(
  p_session_id uuid,
  p_reaction text,
  p_reply text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_response uuid;
  v_status text;
  v_reply text := nullif(left(btrim(coalesce(p_reply, '')), 280), '');
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select pi.status into v_status from public.prompt_instances pi
  where pi.id = p_session_id and public.is_couple_member(pi.couple_id);
  if v_status <> 'revealed' then raise exception 'Answers haven''t been revealed yet.'; end if;

  -- The partner's response on this prompt instance
  select r.id into v_response from public.responses r
  where r.instance_id = p_session_id and r.user_id <> v_user;
  if v_response is null then raise exception 'Partner answer not found.'; end if;

  insert into public.response_reactions (response_id, user_id, emoji, reply)
  values (v_response, v_user, left(btrim(p_reaction), 16), v_reply)
  on conflict (response_id, user_id) do update
    set emoji = coalesce(excluded.emoji, response_reactions.emoji),
        reply = excluded.reply;
end;
$$;

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
  from public.couples c
  join public.profiles p
    on p.id = case when c.partner_1_id = v_user then c.partner_2_id else c.partner_1_id end
  where c.id = v_couple and c.partner_2_id is not null;

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
    'my_reaction', (select rr.emoji from public.response_reactions rr where rr.response_id = v_partner_response.id and rr.user_id = v_user),
    'my_reply', (select rr.reply from public.response_reactions rr where rr.response_id = v_partner_response.id and rr.user_id = v_user),
    'partner_reaction', (select rr.emoji from public.response_reactions rr where rr.response_id = v_my_response.id and rr.user_id <> v_user),
    'partner_reply', (select rr.reply from public.response_reactions rr where rr.response_id = v_my_response.id and rr.user_id <> v_user),
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

grant execute on function public.submit_reveal_reaction(uuid, text, text) to authenticated;
grant execute on function public.get_today_state() to authenticated;
