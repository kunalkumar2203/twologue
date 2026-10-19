-- Migration 4: feature switches
-- "features" is the catalogue. "couple_features" holds each couple's on/off switch and settings.
-- A shared switch: if either partner turns a feature off, it is off for both.

create table public.features (
  key text primary key,
  name text not null,
  phase smallint not null,
  on_by_default boolean not null default true,
  default_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.couple_features (
  couple_id uuid not null references public.couples (id) on delete cascade,
  feature_key text not null references public.features (key) on update cascade,
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (couple_id, feature_key)
);

-- Keeps updated_at correct and records who changed the switch
create or replace function public.couple_features_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

create trigger touch before update on public.couple_features
  for each row execute function public.couple_features_touch();

-- The features planned for version 1
-- (When you add a feature later, also insert a couple_features row for every existing couple.)
insert into public.features (key, name, phase, on_by_default, default_settings) values
  ('daily_question',     'Daily question',                      1, true, '{"depth_dial": "mixed"}'),
  ('appreciation_notes', 'Appreciation notes',                  1, true, '{}'),
  ('micro_challenges',   'Micro daily challenges',              1, true, '{"spicy": false, "disabled_categories": []}'),
  ('journal',            'Blind-reveal journal',                2, true, '{}'),
  ('time_capsule',       'Time capsule',                        2, true, '{}'),
  ('shared_lists',       'Shared bucket list and dream board',  3, true, '{}'),
  ('quick_games',        'Quick games',                         3, true, '{"spicy": false}'),
  ('know_me',            'How well do you know me?',            3, true, '{"show_scores": false}'),
  ('date_night',         'Date night generator',                3, true, '{}'),
  ('story',              'Alternating story',                   4, true, '{}');

-- Privacy
alter table public.features enable row level security;
alter table public.couple_features enable row level security;

revoke all on public.features, public.couple_features from anon, authenticated;

create policy "features_select_all" on public.features
  for select to authenticated using (true);
grant select on public.features to authenticated;

create policy "couple_features_select_members" on public.couple_features
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "couple_features_update_members" on public.couple_features
  for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
grant select on public.couple_features to authenticated;
grant update (enabled, settings) on public.couple_features to authenticated;