-- Migration 5 of 8: signup trigger and pairing functions
-- Run this BEFORE anyone signs up, so every account gets its profile and solo couple.

-- Internal helpers (not callable from the app) -------------------------------------------------

-- Creates a solo couple space for a person, with default feature switches
create or replace function public.create_solo_couple(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid;
  v_tz text;
begin
  select p.time_zone into v_tz from public.profiles p where p.id = p_user_id;

  insert into public.couples (anchor_time_zone)
  values (coalesce(v_tz, 'UTC'))
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, slot)
  values (v_couple_id, p_user_id, 1);

  insert into public.couple_features (couple_id, feature_key, enabled, settings)
  select v_couple_id, f.key, f.on_by_default, f.default_settings from public.features f;

  insert into public.couple_events (couple_id, user_id, event)
  values (v_couple_id, p_user_id, 'created');

  return v_couple_id;
end;
$$;

-- Turns what the person typed into a standard form: upper case, letters and numbers only
create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.hash_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
  extensions.digest(
    convert_to(
      public.normalize_invite_code(p_code),
      'UTF8'
    ),
    'sha256'
  ),
  'hex'
);
$$;

-- 10 random characters, skipping lookalikes (no I, O, 0 or 1)
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(10);
  v_code text := '';
  i int;
begin
  for i in 0..9 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) & 31) + 1, 1);
  end loop;
  return v_code;
end;
$$;

-- Signup trigger -------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_tz text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  -- The app can pass the browser's time zone when signing up. Anything unknown falls back to UTC.
  v_tz := coalesce(nullif(new.raw_user_meta_data ->> 'time_zone', ''), 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_tz) then
    v_tz := 'UTC';
  end if;

  insert into public.profiles (id, display_name, time_zone) values (new.id, v_name, v_tz);
  insert into public.user_settings (user_id) values (new.id);
  perform public.create_solo_couple(new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pairing functions (called by the app) --------------------------------------------------------

-- A taps "Invite your partner": makes a fresh code. The code is returned once and never stored.
create or replace function public.create_invite(p_target_email text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_couple uuid;
  v_code text;
  v_tries int := 0;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  v_couple := public.my_couple_id();
  if v_couple is null then raise exception 'no_couple'; end if;

  -- Only a solo couple can invite. The lock stops two quick taps from clashing.
  perform 1 from public.couples c where c.id = v_couple and c.status = 'solo' for update;
  if not found then raise exception 'already_paired'; end if;

  -- A new invite replaces the old one
  update public.invites set status = 'cancelled'
  where couple_id = v_couple and status = 'pending';

  loop
    v_code := public.generate_invite_code();
    begin
      insert into public.invites (couple_id, created_by, code_hash, target_email, expires_at)
      values (
        v_couple, v_user, public.hash_invite_code(v_code),
        nullif(lower(btrim(p_target_email)), ''), now() + interval '7 days'
      );
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then raise; end if;
    end;
  end loop;

  return substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5);
end;
$$;

-- B opens the link: shows only who invited them and whether the code works. Changes nothing.
create or replace function public.preview_invite(p_code text)
returns table (is_valid boolean, inviter_name text, inviter_avatar text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_name text;
  v_avatar text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  if (
    select count(*) from public.invite_attempts a
    where a.user_id = v_user and not a.succeeded and a.attempted_at > now() - interval '15 minutes'
  ) >= 10 then
    raise exception 'too_many_attempts';
  end if;

  v_hash := public.hash_invite_code(p_code);

  select p.display_name, p.avatar_path into v_name, v_avatar
  from public.invites i
  join public.couples c on c.id = i.couple_id and c.status = 'solo'
  join public.profiles p on p.id = i.created_by
  where i.code_hash = v_hash and i.status = 'pending' and i.expires_at > now();

  if not found then
    insert into public.invite_attempts (user_id, succeeded) values (v_user, false);
    return query select false, null::text, null::text;
    return;
  end if;

  return query select true, v_name, v_avatar;
end;
$$;

-- B taps Accept: every check and every change happens in one step, or nothing happens.
-- Returns 'accepted', or a reason: invalid_invite, own_invite, already_paired,
-- inviter_unavailable, too_many_attempts, no_couple.
create or replace function public.accept_invite(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_inv public.invites%rowtype;
  v_my_couple uuid;
  v_inviter_slot smallint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  if (
    select count(*) from public.invite_attempts a
    where a.user_id = v_user and not a.succeeded and a.attempted_at > now() - interval '15 minutes'
  ) >= 10 then
    return 'too_many_attempts';
  end if;

  -- Lock the invite so two people can't accept it at the same moment
  select * into v_inv from public.invites i
  where i.code_hash = public.hash_invite_code(p_code)
    and i.status = 'pending' and i.expires_at > now()
  for update;

  if not found then
    insert into public.invite_attempts (user_id, succeeded) values (v_user, false);
    return 'invalid_invite';
  end if;

  if v_inv.created_by = v_user then return 'own_invite'; end if;

  v_my_couple := public.my_couple_id();
  if v_my_couple is null then return 'no_couple'; end if;

  -- Lock both couples, always in the same order, so two accepts can't deadlock
  perform 1 from public.couples c where c.id = least(v_my_couple, v_inv.couple_id) for update;
  perform 1 from public.couples c where c.id = greatest(v_my_couple, v_inv.couple_id) for update;

  -- B must still be solo, and A's couple must still be solo
  if (select c.status from public.couples c where c.id = v_my_couple) <> 'solo' then
    return 'already_paired';
  end if;
  if (select c.status from public.couples c where c.id = v_inv.couple_id) <> 'solo' then
    return 'inviter_unavailable';
  end if;

  select m.slot into v_inviter_slot from public.couple_members m
  where m.couple_id = v_inv.couple_id and m.left_at is null;
  if v_inviter_slot is null then return 'inviter_unavailable'; end if;

  -- B's own solo space is closed (its data is kept, not deleted)
  update public.couple_members set left_at = now()
  where couple_id = v_my_couple and user_id = v_user and left_at is null;
  update public.couples set status = 'ended', ended_at = now() where id = v_my_couple;
  update public.invites set status = 'cancelled' where couple_id = v_my_couple and status = 'pending';

  -- B joins A's couple, which becomes active
  insert into public.couple_members (couple_id, user_id, slot)
  values (v_inv.couple_id, v_user, 3 - v_inviter_slot);
  update public.couples set status = 'active', paired_at = now() where id = v_inv.couple_id;
  update public.invites
    set status = 'accepted', accepted_by = v_user, accepted_at = now()
    where id = v_inv.id;

  insert into public.couple_events (couple_id, user_id, event)
  values (v_inv.couple_id, v_user, 'partner_joined');
  insert into public.invite_attempts (user_id, succeeded) values (v_user, true);

  return 'accepted';
end;
$$;

-- A cancels the waiting invite
create or replace function public.cancel_invite()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.invites set status = 'cancelled'
  where couple_id = public.my_couple_id() and status = 'pending';
end;
$$;

-- Either partner can unlink. The couple ends for both, and each gets a fresh solo space.
create or replace function public.unlink_couple()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_couple uuid;
  v_members uuid[];
  v_member uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  v_couple := public.my_couple_id();
  if v_couple is null then raise exception 'no_couple'; end if;

  perform 1 from public.couples c where c.id = v_couple and c.status = 'active' for update;
  if not found then raise exception 'not_paired'; end if;

  select array_agg(m.user_id) into v_members
  from public.couple_members m where m.couple_id = v_couple and m.left_at is null;

  update public.couple_members set left_at = now() where couple_id = v_couple and left_at is null;
  update public.couples set status = 'ended', ended_at = now() where id = v_couple;
  insert into public.couple_events (couple_id, user_id, event) values (v_couple, v_user, 'unlinked');

  foreach v_member in array v_members loop
    perform public.create_solo_couple(v_member);
  end loop;
end;
$$;

-- Who may call what: the app can only call the five pairing functions, and only when signed in
revoke execute on function public.create_solo_couple(uuid) from public, anon, authenticated;
revoke execute on function public.normalize_invite_code(text) from public, anon, authenticated;
revoke execute on function public.hash_invite_code(text) from public, anon, authenticated;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.create_invite(text) from public, anon;
revoke execute on function public.preview_invite(text) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.cancel_invite() from public, anon;
revoke execute on function public.unlink_couple() from public, anon;
grant execute on function public.create_invite(text) to authenticated;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.cancel_invite() to authenticated;
grant execute on function public.unlink_couple() to authenticated;