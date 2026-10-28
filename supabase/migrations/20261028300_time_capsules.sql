-- Time capsules
-- Bodies are never readable straight from the table. Only the functions below return them,
-- and only when the unlock date has come and the viewer is allowed to read them.

-- 1. Tables 

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete cascade, -- only for letters
  audience text not null check (audience in ('joint', 'letter')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 4000),
  occasion text not null check (occasion in ('six_months', 'one_year', 'anniversary', 'custom')),
  sealed_on date not null,
  unlock_on date not null,
  created_at timestamptz not null default now(),
  constraint time_capsules_letter_has_recipient check ((audience = 'letter') = (recipient_id is not null)),
  constraint time_capsules_unlock_after_seal check (unlock_on > sealed_on)
);
create index time_capsules_couple_unlock_idx on public.time_capsules (couple_id, unlock_on);

-- Who has opened an unlocked capsule. Joint capsules are opened once by each partner.
create table public.time_capsule_opens (
  capsule_id uuid not null references public.time_capsules (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (capsule_id, user_id)
);

-- 2. Privacy: no direct access at all

alter table public.time_capsules enable row level security;
alter table public.time_capsule_opens enable row level security;
revoke all on public.time_capsules, public.time_capsule_opens from anon, authenticated;

-- 3. Unlock date rules 

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
      if p_custom is null or p_custom <= p_today then
        raise exception 'Pick a date in the future.';
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

-- 4. Reads 

-- Everything the Us tab needs in one call
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
        'body', case when x.readable and x.opened then x.body end
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
        -- Joint capsules: both see the title and date. Letters: the writer sees it, and the
        -- recipient sees nothing until the unlock day (a surprise).
        and (t.audience = 'joint'
             or t.author_id = v_user
             or (t.recipient_id = v_user and v_today >= t.unlock_on))
    ) x
  );
end;
$$;

-- Opens an unlocked capsule for the viewer. Returns the letter the first time, and records it.
create or replace function public.open_time_capsule(p_capsule_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
  v_capsule public.time_capsules%rowtype;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;

  select * into v_capsule from public.time_capsules t
  where t.id = p_capsule_id and t.couple_id = v_couple;
  if not found then raise exception 'capsule_not_found'; end if;

  v_today := public.couple_today(v_couple);
  if v_today < v_capsule.unlock_on then raise exception 'still_sealed'; end if;
  if v_capsule.audience = 'letter' and v_capsule.recipient_id <> v_user then
    raise exception 'not_your_capsule';
  end if;

  insert into public.time_capsule_opens (capsule_id, user_id)
  values (v_capsule.id, v_user)
  on conflict (capsule_id, user_id) do nothing;

  return v_capsule.body;
end;
$$;

-- 5. Writes 

create or replace function public.create_time_capsule(
  p_title text,
  p_body text,
  p_audience text,
  p_occasion text,
  p_custom_date date default null
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
  v_couple_row public.couples%rowtype;
  v_today date;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  if not public.is_feature_enabled(v_couple, 'time_capsule') then raise exception 'feature_paused'; end if;
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

  insert into public.time_capsules
    (couple_id, author_id, recipient_id, audience, title, body, occasion, sealed_on, unlock_on)
  values
    (v_couple, v_user,
     case when p_audience = 'letter' then v_partner end,
     p_audience, v_title, v_body, p_occasion, v_today,
     public.capsule_unlock_date(p_occasion, v_couple_row.anniversary_date, v_today, p_custom_date))
  returning id into v_id;

  return v_id;
end;
$$;

-- 6. Privileges 

revoke execute on function public.capsule_unlock_date(text, date, date, date) from public, anon, authenticated;
revoke execute on function public.list_time_capsules() from public, anon;
revoke execute on function public.open_time_capsule(uuid) from public, anon;
revoke execute on function public.create_time_capsule(text, text, text, text, date) from public, anon;

grant execute on function public.list_time_capsules() to authenticated;
grant execute on function public.open_time_capsule(uuid) to authenticated;
grant execute on function public.create_time_capsule(text, text, text, text, date) to authenticated;