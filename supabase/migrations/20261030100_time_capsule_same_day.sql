-- Allow time capsules to be sealed for the same day (today)
-- 1. Update check constraint on time_capsules table
alter table public.time_capsules drop constraint if exists time_capsules_unlock_after_seal;
alter table public.time_capsules add constraint time_capsules_unlock_after_seal check (unlock_on >= sealed_on);

-- 2. Update capsule_unlock_date to allow custom date to be today or in the future
create or replace function public.capsule_unlock_date(
  p_occasion text,
  p_anniversary date,
  p_today date,
  p_custom date
)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_candidate date;
begin
  case p_occasion
    when 'six_months' then
      return (p_today + make_interval(months => 6))::date;
    when 'one_year' then
      return (p_today + make_interval(years => 1))::date;
    when 'anniversary' then
      if p_anniversary is null then raise exception 'set_anniversary_first'; end if;
      v_candidate := (p_anniversary + make_interval(
        years => extract(year from p_today)::int - extract(year from p_anniversary)::int))::date;
      if v_candidate <= p_today then
        v_candidate := (p_anniversary + make_interval(
          years => extract(year from p_today)::int + 1 - extract(year from p_anniversary)::int))::date;
      end if;
      return v_candidate;
    when 'custom' then
      if p_custom is null or p_custom < p_today then
        raise exception 'Pick today or a date in the future.';
      end if;
      if p_custom > (p_today + make_interval(years => 100))::date then
        raise exception 'Capsules can open up to 100 years from now.';
      end if;
      return p_custom;
    else
      raise exception 'invalid_occasion';
  end case;
end;
$$;

revoke execute on function public.capsule_unlock_date(text, date, date, date) from public, anon, authenticated;

-- 3. Update update_time_capsule to allow recomputing unlock date on unopened same-day capsules
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

  -- If still sealed and unopened, recompute unlock date; if already opened/past, preserve unlock date
  if not exists (select 1 from public.time_capsule_opens o where o.capsule_id = v_capsule.id)
     and v_today <= v_capsule.unlock_on then
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

revoke execute on function public.update_time_capsule(uuid, text, text, text, text, date) from public, anon;
grant execute on function public.update_time_capsule(uuid, text, text, text, text, date) to authenticated;
