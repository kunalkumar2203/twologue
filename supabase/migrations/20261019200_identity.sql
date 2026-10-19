-- Migration 2: identity
-- Supabase Auth already stores logins (auth.users). These tables hold everything else about a person.
-- Rows are created automatically by the signup trigger in migration 5.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  time_zone text not null default 'UTC',
  language text not null default 'en',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'ember',
  mode text not null default 'light' check (mode in ('light', 'dark')),
  reminder_time time not null default '20:00',
  nudges_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proof of what each person agreed to. Rows are only ever added, never edited.
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now(),
  confirmed_18_plus boolean not null default false,
  unique (user_id, document, version)
);

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Privacy: row-level security on, and only the access each table needs
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_consents enable row level security;

revoke all on public.profiles, public.user_settings, public.user_consents from anon, authenticated;

-- Profiles: you can read and edit your own. (Reading your partner's comes in migration 3.)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path, time_zone, language, onboarding_completed_at)
  on public.profiles to authenticated;

-- Settings: your own only
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.user_settings to authenticated;
grant update (theme, mode, reminder_time, nudges_enabled, email_enabled, push_enabled)
  on public.user_settings to authenticated;

-- Consents: read your own, add your own, never change them
create policy "user_consents_select_own" on public.user_consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_consents_insert_own" on public.user_consents
  for insert to authenticated with check (user_id = (select auth.uid()));
grant select on public.user_consents to authenticated;
grant insert (document, version, confirmed_18_plus) on public.user_consents to authenticated;