-- Migration: Author update and delete for time capsules
-- Allows only the author of a time capsule to update its details (title, body, audience, occasion/date)
-- or permanently delete the capsule.

create or replace function public.list_time_capsules()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'time_capsule') then return null; end if;

  v_today := public.couple_today(v_couple);

  return (
    select jsonb_build_object(
      'couple_id', v_couple,
      'today', v_today,
      'has_partner', public.my_partner_id() is not null,
      'partner_name', coalesce(
        (select nullif(p.display_name, '') from public.profiles p where p.id = public.my_partner_id()),
        'Your partner'),
      'anniversary_date', (select c.anniversary_date from public.couples c where c.id = v_couple),
      'capsules', coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'audience', x.audience,
        'occasion', x.occasion,
        'sealed_on', x.sealed_on,
        'unlock_on', x.unlock_on,
        'days_left', greatest(x.unlock_on - v_today, 0),
        'is_mine', x.is_mine,
        'author_name', x.author_name,
        'recipient_name', x.recipient_name,
        'readable', x.readable,
        'ready_to_open', x.readable and not x.opened,
        'body', case when x.is_mine or (x.readable and x.opened) then x.body end
      ) order by x.unlock_on), '[]'::jsonb)
    )
    from (
      select t.id, t.title, t.audience, t.occasion, t.sealed_on, t.unlock_on, t.body,
             t.author_id = v_user as is_mine,
             case when t.author_id = v_user then 'You'
                  else coalesce(nullif(a.display_name, ''), 'Your partner') end as author_name,
             coalesce(nullif(r.display_name, ''), 'Your partner') as recipient_name,
             (t.audience = 'joint' or t.recipient_id = v_user) and v_today >= t.unlock_on as readable,
             (o.capsule_id is not null) as opened
      from public.time_capsules t
      join public.profiles a on a.id = t.author_id
      left join public.profiles r on r.id = t.recipient_id
      left join public.time_capsule_opens o on o.capsule_id = t.id and o.user_id = v_user
      where t.couple_id = v_couple
    ) x
  );
end;
$$;

create or replace function public.update_time_capsule(
  p_capsule_id uuid,
  p_title text,
  p_body text,
  p_audience text,
  p_occasion text,
  p_custom_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_partner uuid := public.my_partner_id();
  v_couple_row public.couples%rowtype;
  v_capsule public.time_capsules%rowtype;
  v_today date;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_unlock_date date;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'time_capsule') then raise exception 'feature_paused'; end if;

  select * into v_capsule from public.time_capsules
  where id = p_capsule_id and couple_id = v_couple;
  if not found then raise exception 'capsule_not_found'; end if;

  -- Only the author can update their time capsule
  if v_capsule.author_id <> v_user then
    raise exception 'not_authorized';
  end if;

  if p_audience not in ('joint', 'letter') then raise exception 'invalid_audience'; end if;
  if p_audience = 'letter' and v_partner is null then raise exception 'letter_needs_partner'; end if;
  if char_length(v_title) not between 1 and 80 then
    raise exception 'Give the capsule a title of up to 80 characters.';
  end if;
  if char_length(v_body) not between 1 and 4000 then
    raise exception 'Capsules hold 1 to 4000 characters.';
  end if;

  select * into v_couple_row from public.couples c where c.id = v_couple;
  v_today := public.couple_today(v_couple);

  -- If still sealed, recompute unlock date; if already opened/unlocked, preserve unlock date
  if v_today < v_capsule.unlock_on then
    v_unlock_date := public.capsule_unlock_date(p_occasion, v_couple_row.anniversary_date, v_today, p_custom_date);
  else
    v_unlock_date := v_capsule.unlock_on;
  end if;

  update public.time_capsules
  set title = v_title,
      body = v_body,
      audience = p_audience,
      recipient_id = case when p_audience = 'letter' then v_partner else null end,
      occasion = p_occasion,
      unlock_on = v_unlock_date
  where id = p_capsule_id and author_id = v_user;
end;
$$;

create or replace function public.delete_time_capsule(p_capsule_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_capsule public.time_capsules%rowtype;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'time_capsule') then raise exception 'feature_paused'; end if;

  select * into v_capsule from public.time_capsules
  where id = p_capsule_id and couple_id = v_couple;
  if not found then raise exception 'capsule_not_found'; end if;

  -- Only the author can delete their time capsule
  if v_capsule.author_id <> v_user then
    raise exception 'not_authorized';
  end if;

  delete from public.time_capsules
  where id = p_capsule_id and author_id = v_user;
end;
$$;

revoke execute on function public.update_time_capsule(uuid, text, text, text, text, date) from public, anon;
revoke execute on function public.delete_time_capsule(uuid) from public, anon;

grant execute on function public.update_time_capsule(uuid, text, text, text, text, date) to authenticated;
grant execute on function public.delete_time_capsule(uuid) to authenticated;
