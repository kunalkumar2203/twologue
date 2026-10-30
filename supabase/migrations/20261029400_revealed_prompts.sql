-- Revealed answers archive ("Our answers" for daily questions, "Our pages" for journal),
-- and journal prompt selection that follows the couple's setup.

-- 1. One archive function for both kinds (replaces list_journal_pages)
create or replace function public.list_revealed_prompts(p_kind text, p_limit int default 20, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('daily_question', 'journal') then raise exception 'invalid_kind'; end if;

  return coalesce((
    select jsonb_agg(x.page order by x.for_date desc)
    from (
      select pi.for_date,
             jsonb_build_object(
               'instance_id', pi.id,
               'for_date', pi.for_date,
               'prompt', pi.copied_text,
               'revealed_at', pi.revealed_at,
               'entries', public.journal_entries_json(pi.id, v_user)
             ) as page
      from public.prompt_instances pi
      where pi.couple_id = v_couple and pi.kind = p_kind and pi.status = 'revealed'
      order by pi.for_date desc
      limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
    ) x
  ), '[]'::jsonb);
end;
$$;

drop function if exists public.list_journal_pages(int, int);

-- 2. Journal prompt pick: unseen first, long-distance and stage rules as for daily questions
create or replace function public.pick_journal_prompt(p_couple uuid, p_long_distance boolean, p_stage text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select ci.id
  from public.content_items ci
  where ci.type = 'journal_prompt'
    and ci.status = 'published'
    and (p_long_distance or not ('long-distance' = any(ci.tags)))
  order by
    exists (select 1 from public.couple_content_history h
            where h.couple_id = p_couple and h.content_id = ci.id and h.content_type = 'journal_prompt'),
    (case when (p_stage = 'just_started' and 'new-couple' = any(ci.tags))
            or (p_stage = 'many_years' and 'years-together' = any(ci.tags)) then 0 else 1 end),
    random()
  limit 1;
$$;

revoke execute on function public.pick_journal_prompt(uuid, boolean, text) from public, anon, authenticated;

-- 3. Today's journal prompt (same behaviour as before, new prompt rules)
create or replace function public.get_journal_today()
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
  v_today date;
  v_instance public.prompt_instances%rowtype;
  v_content_id uuid;
  v_mine public.responses%rowtype;
  v_theirs public.responses%rowtype;
  v_partner_name text;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'journal') then return null; end if;

  v_today := public.couple_today(v_couple);
  select * into v_couple_row from public.couples c where c.id = v_couple;

  select * into v_instance from public.prompt_instances pi
  where pi.couple_id = v_couple and pi.kind = 'journal' and pi.for_date = v_today;

  if not found then
    v_content_id := public.pick_journal_prompt(v_couple, v_couple_row.is_long_distance, v_couple_row.relationship_stage);
    if v_content_id is null then raise exception 'no_journal_prompt'; end if;

    insert into public.prompt_instances (couple_id, kind, content_id, copied_text, for_date)
    select v_couple, 'journal', ci.id, ci.body, v_today
    from public.content_items ci
    where ci.id = v_content_id
    on conflict (couple_id, kind, for_date) do nothing
    returning * into v_instance;

    if found then
      insert into public.couple_content_history
        (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
      values (v_couple, v_content_id, 'journal_prompt', v_instance.copied_text, v_today, 'shown', v_user);
    else
      select * into v_instance from public.prompt_instances pi
      where pi.couple_id = v_couple and pi.kind = 'journal' and pi.for_date = v_today;
    end if;
  end if;

  select * into v_mine from public.responses r where r.instance_id = v_instance.id and r.user_id = v_user;
  select * into v_theirs from public.responses r where r.instance_id = v_instance.id and r.user_id = v_partner;
  select p.display_name into v_partner_name from public.profiles p where p.id = v_partner;

  return jsonb_build_object(
    'instance_id', v_instance.id,
    'for_date', v_instance.for_date,
    'prompt', v_instance.copied_text,
    'status', v_instance.status,
    'my_state', coalesce(v_mine.state, 'none'),
    'my_body', v_mine.body,
    'partner_name', coalesce(nullif(v_partner_name, ''), 'Your partner'),
    'partner_state', case
      when v_theirs.state = 'submitted' then 'done'
      when v_theirs.state = 'passed' then 'passed'
      else 'waiting' end,
    'entries', case when v_instance.status = 'revealed'
                    then public.journal_entries_json(v_instance.id, v_user)
                    else '[]'::jsonb end,
    'pages_written', (select count(*) from public.prompt_instances pi
                      where pi.couple_id = v_couple and pi.kind = 'journal' and pi.status = 'revealed')
  );
end;
$$;

-- 4. Privileges
revoke execute on function public.list_revealed_prompts(text, int, int) from public, anon;
grant execute on function public.list_revealed_prompts(text, int, int) to authenticated;
