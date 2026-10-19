-- Migration 3: couples and pairing tables
-- Every person starts in their own "solo" couple. Pairing joins a second person to it.

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'solo' check (status in ('solo', 'active', 'ended')),
  anchor_time_zone text not null default 'UTC',
  anniversary_date date,
  is_long_distance boolean not null default false,
  paired_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couples_ended_matches_status check ((status = 'ended') = (ended_at is not null))
);

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot smallint not null check (slot in (1, 2)), -- a fixed seat, no gender or role meaning
  joined_at timestamptz not null default now(),
  left_at timestamptz                            -- empty means the person is still in the couple
);
-- A person can be in only one active couple
create unique index couple_members_one_active_couple_per_user
  on public.couple_members (user_id) where left_at is null;
-- A couple can have only two active members (one per slot)
create unique index couple_members_one_active_per_slot
  on public.couple_members (couple_id, slot) where left_at is null;
create index couple_members_couple_idx on public.couple_members (couple_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null,        -- only a fingerprint of the code is stored, never the code
  target_email text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- A couple can have only one pending invite, and a pending code must be unique
create unique index invites_one_pending_per_couple on public.invites (couple_id) where status = 'pending';
create unique index invites_pending_code_unique on public.invites (code_hash) where status = 'pending';

-- Failed code guesses, used to slow down guessing. Old rows can be cleared regularly.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null
);
create index invite_attempts_user_time_idx on public.invite_attempts (user_id, attempted_at desc);

-- A simple history of what happened to a couple, for support
create table public.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event text not null check (event in ('created', 'partner_joined', 'unlinked')),
  created_at timestamptz not null default now()
);
create index couple_events_couple_idx on public.couple_events (couple_id, created_at desc);

create trigger set_updated_at before update on public.couples
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invites
  for each row execute function public.set_updated_at();

-- Helpers used by the privacy rules (they run with owner rights, so the rules don't loop on themselves)
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.couple_members m
    where m.couple_id = p_couple_id
      and m.user_id = (select auth.uid())
      and m.left_at is null
  );
$$;

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.couple_id from public.couple_members m
  where m.user_id = (select auth.uid()) and m.left_at is null
  limit 1;
$$;

create or replace function public.my_partner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id
  from public.couple_members m
  join public.couple_members p
    on p.couple_id = m.couple_id and p.user_id <> m.user_id and p.left_at is null
  where m.user_id = (select auth.uid()) and m.left_at is null
  limit 1;
$$;

revoke execute on function public.is_couple_member(uuid) from public, anon;
revoke execute on function public.my_couple_id() from public, anon;
revoke execute on function public.my_partner_id() from public, anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.my_couple_id() to authenticated;
grant execute on function public.my_partner_id() to authenticated;

-- Privacy: row-level security on, and only the access each table needs
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.invites enable row level security;
alter table public.invite_attempts enable row level security;
alter table public.couple_events enable row level security;

revoke all on public.couples, public.couple_members, public.invites,
  public.invite_attempts, public.couple_events from anon, authenticated;

-- Partners can read each other's profile (nobody else can)
create policy "profiles_select_partner" on public.profiles
  for select to authenticated using (id = (select public.my_partner_id()));

-- Couples: members can read, and edit only three harmless fields. Everything else goes through functions.
create policy "couples_select_members" on public.couples
  for select to authenticated using (public.is_couple_member(id));
create policy "couples_update_members" on public.couples
  for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));
grant select on public.couples to authenticated;
grant update (anchor_time_zone, anniversary_date, is_long_distance) on public.couples to authenticated;

-- Members and events: read only
create policy "couple_members_select_members" on public.couple_members
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.couple_members to authenticated;

create policy "couple_events_select_members" on public.couple_events
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.couple_events to authenticated;

-- Invites: only the person who made it can see it. Writing happens only through functions.
create policy "invites_select_creator" on public.invites
  for select to authenticated using (created_by = (select auth.uid()));
grant select on public.invites to authenticated;

-- invite_attempts: no access from the app at all (functions only)