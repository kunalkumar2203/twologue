-- Migration 9: merge couple_members into couples
-- A couple always has at most two people, so the two people are now stored on the couple itself:
--   partner_1_id = the person who created the couple space (always set)
--   partner_2_id = the person who joined by invite (empty while the couple is solo)
-- Existing data is copied across before couple_members is removed.
-- Everything runs as one all-or-nothing step: if anything fails, nothing changes.

begin;

-- 1. New columns ------------------------------------------------------------------------------
-- Note: deleting a person's account deletes their couple space too (on delete cascade).
alter table public.couples
  add column partner_1_id uuid references public.profiles (id) on delete cascade,
  add column partner_2_id uuid references public.profiles (id) on delete cascade;

-- 2. Copy the people over from couple_members --------------------------------------------------
update public.couples c set
  partner_1_id = (select m.user_id from public.couple_members m
                  where m.couple_id = c.id and m.slot = 1 order by m.joined_at desc limit 1),
  partner_2_id = (select m.user_id from public.couple_members m
                  where m.couple_id = c.id and m.slot = 2 order by m.joined_at desc limit 1);

-- A couple whose first person was deleted but whose second is still here: the second person
-- becomes the only member, and the couple goes back to solo.
update public.couples
set partner_1_id = partner_2_id,
    partner_2_id = null,
    status = case when status = 'active' then 'solo' else status end,
    paired_at = case when status = 'active' then null else paired_at end,
    ended_at  = case when status = 'active' then null else ended_at end
where partner_1_id is null and partner_2_id is not null;

-- Couples nobody belongs to any more (for example from deleted test accounts) can't be reached
-- by anyone, so they are removed together with their data.
delete from public.couples where partner_1_id is null;

-- 3. Rules ------------------------------------------------------------------------------------
alter table public.couples alter column partner_1_id set not null;

alter table public.couples
  add constraint couples_partners_differ check (partner_2_id is distinct from partner_1_id),
  add constraint couples_solo_has_one_partner check (status <> 'solo' or partner_2_id is null),
  add constraint couples_active_has_two_partners check (status <> 'active' or partner_2_id is not null);

-- A person can be in only one couple that hasn't ended, in either position
create unique index couples_partner_1_one_open_couple on public.couples (partner_1_id) where status <> 'ended';
create unique index couples_partner_2_one_open_couple on public.couples (partner_2_id) where status <> 'ended';

-- The two indexes above can't see across positions (someone as partner 1 in one couple and
-- partner 2 in another), so this check covers that. The lock makes it safe when two things
-- happen at the same moment.
create or replace function public.couples_check_partners()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if new.status = 'ended' then return new; end if;

  for v_user in
    select u from unnest(array[new.partner_1_id, new.partner_2_id]) as u where u is not null order by u
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
    if exists (
      select 1 from public.couples c
      where c.id <> new.id and c.status <> 'ended'
        and (c.partner_1_id = v_user or c.partner_2_id = v_user)
    ) then
      raise exception 'user_already_in_a_couple';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.couples_check_partners() from public, anon, authenticated;

create trigger check_partners
  before insert or update of partner_1_id, partner_2_id, status on public.couples
  for each row execute function public.couples_check_partners();

-- 4. Helper functions now read from couples ----------------------------------------------------
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.couples c
    where c.id = p_couple_id
      and c.status <> 'ended'
      and ((select auth.uid()) = c.partner_1_id or (select auth.uid()) = c.partner_2_id)
  );
$$;

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.couples c
  where c.status <> 'ended'
    and ((select auth.uid()) = c.partner_1_id or (select auth.uid()) = c.partner_2_id)
  limit 1;
$$;

create or replace function public.my_partner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when c.partner_1_id = (select auth.uid()) then c.partner_2_id else c.partner_1_id end
  from public.couples c
  where c.status <> 'ended'
    and ((select auth.uid()) = c.partner_1_id or (select auth.uid()) = c.partner_2_id)
  limit 1;
$$;

-- 5. Functions that used couple_members are rewritten -------------------------------------------
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

  insert into public.couples (anchor_time_zone, partner_1_id)
  values (coalesce(v_tz, 'UTC'), p_user_id)
  returning id into v_couple_id;

  insert into public.couple_features (couple_id, feature_key, enabled, settings)
  select v_couple_id, f.key, f.on_by_default, f.default_settings from public.features f;

  insert into public.couple_events (couple_id, user_id, event)
  values (v_couple_id, p_user_id, 'created');

  return v_couple_id;
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

  -- B's own solo space is closed (its data is kept, not deleted)
  update public.couples set status = 'ended', ended_at = now() where id = v_my_couple;
  update public.invites set status = 'cancelled' where couple_id = v_my_couple and status = 'pending';

  -- B joins A's couple, which becomes active
  update public.couples
    set partner_2_id = v_user, status = 'active', paired_at = now()
    where id = v_inv.couple_id;
  update public.invites
    set status = 'accepted', accepted_by = v_user, accepted_at = now()
    where id = v_inv.id;

  insert into public.couple_events (couple_id, user_id, event)
  values (v_inv.couple_id, v_user, 'partner_joined');
  insert into public.invite_attempts (user_id, succeeded) values (v_user, true);

  return 'accepted';
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
  v_partner_1 uuid;
  v_partner_2 uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  v_couple := public.my_couple_id();
  if v_couple is null then raise exception 'no_couple'; end if;

  select c.partner_1_id, c.partner_2_id into v_partner_1, v_partner_2
  from public.couples c where c.id = v_couple and c.status = 'active' for update;
  if not found then raise exception 'not_paired'; end if;

  update public.couples set status = 'ended', ended_at = now() where id = v_couple;
  insert into public.couple_events (couple_id, user_id, event) values (v_couple, v_user, 'unlinked');

  perform public.create_solo_couple(v_partner_1);
  perform public.create_solo_couple(v_partner_2);
end;
$$;

-- "Partner is done / not done yet": shows only that, never any content or drafts
create or replace function public.get_response_status(p_instance_id uuid)
returns table (user_id uuid, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(r.state in ('submitted', 'passed'), false) as done
  from public.prompt_instances pi
  join public.couples c on c.id = pi.couple_id
  cross join lateral (values (c.partner_1_id), (c.partner_2_id)) as m (user_id)
  left join public.responses r on r.instance_id = pi.id and r.user_id = m.user_id
  where pi.id = p_instance_id
    and m.user_id is not null
    and public.is_couple_member(pi.couple_id);
$$;

-- 6. Remove the old table (its index and read policy go with it) ---------------------------------
drop table public.couple_members;

commit;