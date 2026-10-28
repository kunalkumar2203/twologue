-- Journal: blind-reveal entries ("Write together" and "Our pages")
--   1. Entries reveal as soon as both have submitted.
--   2. A pass closes the prompt straight away for both.
-- The daily question rules are unchanged.

-- 1. Helpers

create or replace function public.is_feature_enabled(p_couple_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select cf.enabled from public.couple_features cf
      where cf.couple_id = p_couple_id and cf.feature_key = p_feature),
    true
  );
$$;

-- Today for the couple, in the couple's time zone, so both partners share one day
create or replace function public.couple_today(p_couple_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone c.anchor_time_zone)::date
  from public.couples c
  where c.id = p_couple_id;
$$;

revoke execute on function public.is_feature_enabled(uuid, text) from public, anon, authenticated;
revoke execute on function public.couple_today(uuid) from public, anon, authenticated;

-- Existing couples get the three new switches (on by default)
insert into public.couple_features (couple_id, feature_key, enabled, settings)
select c.id, f.key, f.on_by_default, f.default_settings
from public.couples c
cross join public.features f
where f.key in ('journal', 'story', 'time_capsule')
on conflict (couple_id, feature_key) do nothing;

-- 2. Reveal engine: journal rules added, daily question rules kept

create or replace function public.responses_reveal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_done int;
  v_submitted int;
  v_requested int;
  v_passed int;
begin
  perform 1 from public.prompt_instances pi where pi.id = new.instance_id for update;
  select pi.kind into v_kind from public.prompt_instances pi where pi.id = new.instance_id;

  select count(*) filter (where r.state in ('submitted', 'passed')),
         count(*) filter (where r.state = 'submitted'),
         count(*) filter (where r.reveal_requested),
         count(*) filter (where r.state = 'passed')
    into v_done, v_submitted, v_requested, v_passed
  from public.responses r
  where r.instance_id = new.instance_id;

  if v_kind = 'journal' then
    if v_passed > 0 then
      update public.prompt_instances set status = 'skipped'
      where id = new.instance_id and status = 'open';
    elsif v_submitted >= 2 then
      update public.prompt_instances set status = 'revealed', revealed_at = now()
      where id = new.instance_id and status = 'open';
    end if;
    return new;
  end if;

  -- Daily question: unchanged rules
  if v_done >= 2 then
    if v_passed > 0 then
      update public.prompt_instances set status = 'skipped'
      where id = new.instance_id and status = 'open';
    elsif v_submitted >= 2 and v_requested >= 2 then
      update public.prompt_instances set status = 'revealed', revealed_at = now()
      where id = new.instance_id and status = 'open';
    end if;
  end if;

  return new;
end;
$$;

-- 3. Content: journal prompts (same ids as the dictionary) 

insert into public.content_items (ref, type, body, depth, tags) values
  ('jp-001', 'journal_prompt', 'Describe our last really good day using only what you saw, heard and smelled.', 'light', '{memories}'),
  ('jp-002', 'journal_prompt', 'Write a short letter to us from five years from now.', 'medium', '{future}'),
  ('jp-003', 'journal_prompt', 'What''s a small thing in our routine that you''d miss if it disappeared?', 'light', '{everyday}'),
  ('jp-004', 'journal_prompt', 'Write about a moment this week when you felt close to me.', 'medium', '{gratitude}'),
  ('jp-005', 'journal_prompt', 'Describe the first time you really noticed me.', 'light', '{memories,new-couple}'),
  ('jp-008', 'journal_prompt', 'What''s something you felt early on that you never told me?', 'deep', '{new-couple,values}'),
  ('jp-009', 'journal_prompt', 'What did you need this week that you didn''t ask for?', 'medium', '{values}'),
  ('jp-011', 'journal_prompt', 'Describe our relationship as a place. What does it look, sound and smell like?', 'medium', '{playful}'),
  ('jp-013', 'journal_prompt', 'Write down three tiny moments from this week you''re grateful for.', 'light', '{gratitude}'),
  ('jp-017', 'journal_prompt', 'What do you hope for the next chapter of our life?', 'deep', '{future}'),
  ('jp-019', 'journal_prompt', 'Describe an ordinary Tuesday in our future, hour by hour.', 'medium', '{future}'),
  ('jp-021', 'journal_prompt', 'What would you like me to know about your inner world this week?', 'deep', '{values}')
on conflict (ref) do nothing;

-- 4. Reads 

-- Both entries of a prompt as the couple should see them. Only called once revealed.
create or replace function public.journal_entries_json(p_instance_id uuid, p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'response_id', r.id,
      'is_me', r.user_id = p_me,
      'name', case when r.user_id = p_me then 'You'
                   else coalesce(nullif(p.display_name, ''), 'Your partner') end,
      'body', r.body,
      'reaction', rr.emoji,
      'reply', rr.reply,
      'reaction_is_mine', rr.user_id = p_me
    )
    order by (r.user_id = p_me) desc
  ), '[]'::jsonb)
  from public.responses r
  join public.profiles p on p.id = r.user_id
  left join public.response_reactions rr
    on rr.response_id = r.id and rr.user_id <> r.user_id
  where r.instance_id = p_instance_id
    and r.state = 'submitted';
$$;

-- Today's journal prompt for the couple (created on first visit of the day)
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
  v_today date;
  v_instance public.prompt_instances%rowtype;
  v_content public.content_items%rowtype;
  v_mine public.responses%rowtype;
  v_theirs public.responses%rowtype;
  v_partner_name text;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'journal') then return null; end if;

  v_today := public.couple_today(v_couple);

  select * into v_instance from public.prompt_instances pi
  where pi.couple_id = v_couple and pi.kind = 'journal' and pi.for_date = v_today;

  if not found then
    -- Prefer a prompt this couple has not seen yet
    select ci.* into v_content from public.content_items ci
    where ci.type = 'journal_prompt' and ci.status = 'published'
      and not exists (
        select 1 from public.couple_content_history h
        where h.couple_id = v_couple and h.content_id = ci.id and h.content_type = 'journal_prompt'
      )
    order by random() limit 1;

    if not found then
      select ci.* into v_content from public.content_items ci
      where ci.type = 'journal_prompt' and ci.status = 'published'
      order by random() limit 1;
    end if;
    if not found then raise exception 'no_journal_prompt'; end if;

    insert into public.prompt_instances (couple_id, kind, content_id, copied_text, for_date)
    values (v_couple, 'journal', v_content.id, v_content.body, v_today)
    on conflict (couple_id, kind, for_date) do nothing
    returning * into v_instance;

    if found then
      insert into public.couple_content_history
        (couple_id, content_id, content_type, copied_text, shown_on, action, user_id)
      values (v_couple, v_content.id, 'journal_prompt', v_content.body, v_today, 'shown', v_user);
    else
      -- The partner opened the page at the same moment and made today's prompt first
      select * into v_instance from public.prompt_instances pi
      where pi.couple_id = v_couple and pi.kind = 'journal' and pi.for_date = v_today;
    end if;
  end if;

  select * into v_mine from public.responses r
  where r.instance_id = v_instance.id and r.user_id = v_user;
  select * into v_theirs from public.responses r
  where r.instance_id = v_instance.id and r.user_id = v_partner;
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

-- Past revealed prompts, newest first ("Our pages")
create or replace function public.list_journal_pages(p_limit int default 20, p_offset int default 0)
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
      where pi.couple_id = v_couple and pi.kind = 'journal' and pi.status = 'revealed'
      order by pi.for_date desc
      limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 5. Writes 

-- Autosave: keeps the private draft, up to the point of sending
create or replace function public.save_journal_draft(p_instance_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_state text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  perform 1 from public.prompt_instances pi
  where pi.id = p_instance_id and pi.kind = 'journal' and pi.status = 'open'
    and public.is_couple_member(pi.couple_id);
  if not found then raise exception 'journal_closed'; end if;

  select r.state into v_state from public.responses r
  where r.instance_id = p_instance_id and r.user_id = v_user;
  if v_state in ('submitted', 'passed') then raise exception 'entry_locked'; end if;

  insert into public.responses (instance_id, user_id, body, state)
  values (p_instance_id, v_user, left(coalesce(p_body, ''), 5000), 'draft')
  on conflict (instance_id, user_id) do update set body = excluded.body;
end;
$$;

-- Sends and locks your entry
create or replace function public.submit_journal_entry(p_instance_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_state text;
  v_text text := btrim(coalesce(p_body, ''));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if char_length(v_text) < 1 then raise exception 'Write something before sending.'; end if;
  if char_length(v_text) > 5000 then raise exception 'Entries can be up to 5000 characters.'; end if;

  perform 1 from public.prompt_instances pi
  where pi.id = p_instance_id and pi.kind = 'journal' and pi.status = 'open'
    and public.is_couple_member(pi.couple_id);
  if not found then raise exception 'journal_closed'; end if;

  select r.state into v_state from public.responses r
  where r.instance_id = p_instance_id and r.user_id = v_user;
  if v_state in ('submitted', 'passed') then raise exception 'entry_locked'; end if;

  insert into public.responses (instance_id, user_id, body, state)
  values (p_instance_id, v_user, v_text, 'submitted')
  on conflict (instance_id, user_id) do update set body = excluded.body, state = 'submitted';
end;
$$;

-- Passing: no entry is shown, and the prompt closes for both
create or replace function public.pass_journal_prompt(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_state text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  perform 1 from public.prompt_instances pi
  where pi.id = p_instance_id and pi.kind = 'journal' and pi.status = 'open'
    and public.is_couple_member(pi.couple_id);
  if not found then raise exception 'journal_closed'; end if;

  select r.state into v_state from public.responses r
  where r.instance_id = p_instance_id and r.user_id = v_user;
  if v_state = 'submitted' then raise exception 'entry_locked'; end if;

  insert into public.responses (instance_id, user_id, body, state)
  values (p_instance_id, v_user, '', 'passed')
  on conflict (instance_id, user_id) do update set body = '', state = 'passed';
end;
$$;

-- 6. Privileges

revoke execute on function public.journal_entries_json(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_journal_today() from public, anon;
revoke execute on function public.list_journal_pages(int, int) from public, anon;
revoke execute on function public.save_journal_draft(uuid, text) from public, anon;
revoke execute on function public.submit_journal_entry(uuid, text) from public, anon;
revoke execute on function public.pass_journal_prompt(uuid) from public, anon;

grant execute on function public.get_journal_today() to authenticated;
grant execute on function public.list_journal_pages(int, int) to authenticated;
grant execute on function public.save_journal_draft(uuid, text) to authenticated;
grant execute on function public.submit_journal_entry(uuid, text) to authenticated;
grant execute on function public.pass_journal_prompt(uuid) to authenticated;