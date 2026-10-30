-- Couple setup: the shared basics chosen at the start, and changeable any time later.

-- 1. New basics on the couple row
alter table public.couples
  add column if not exists relationship_stage text
    check (relationship_stage in ('just_started', 'few_years', 'many_years')),
  add column if not exists has_children boolean,
  add column if not exists is_married boolean,
  add column if not exists setup_completed_at timestamptz;

-- 2. Mood becomes a switch like the others
insert into public.features (key, name, phase, on_by_default, default_settings)
values ('mood', 'Emotional weather', 1, true, '{}')
on conflict (key) do nothing;

insert into public.couple_features (couple_id, feature_key, enabled, settings)
select c.id, 'mood', true, '{}'::jsonb
from public.couples c
on conflict (couple_id, feature_key) do nothing;

-- 3. The switch's "who paused it" should only change when the switch itself changes
-- Before, any edit (for example a depth change) claimed the pause for the editor.
create or replace function public.couple_features_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.enabled is distinct from old.enabled then
    new.updated_by = (select auth.uid());
  end if;
  return new;
end;
$$;

-- 4. Everything the setup and settings screens need, in one call
create or replace function public.get_couple_setup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple public.couples%rowtype;
  v_partner uuid;
  v_me public.profiles%rowtype;
  v_them public.profiles%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_couple from public.couples c where c.id = public.my_couple_id();
  if not found then return null; end if;

  v_partner := case when v_couple.partner_1_id = v_user then v_couple.partner_2_id else v_couple.partner_1_id end;
  select * into v_me from public.profiles p where p.id = v_user;
  select * into v_them from public.profiles p where p.id = v_partner;

  return jsonb_build_object(
    'couple_id', v_couple.id,
    'status', v_couple.status,
    'is_setup_owner', v_couple.partner_1_id = v_user,
    'setup_completed', v_couple.setup_completed_at is not null,
    'me', jsonb_build_object(
      'name', coalesce(nullif(v_me.display_name, ''), 'You'),
      'time_zone', v_me.time_zone),
    'partner', case when v_partner is null then null else jsonb_build_object(
      'name', coalesce(nullif(v_them.display_name, ''), 'Your partner'),
      'time_zone', v_them.time_zone) end,
    'settings', jsonb_build_object(
      'anchor_time_zone', v_couple.anchor_time_zone,
      'is_long_distance', v_couple.is_long_distance,
      'relationship_stage', v_couple.relationship_stage,
      'has_children', v_couple.has_children,
      'is_married', v_couple.is_married,
      'anniversary_date', v_couple.anniversary_date),
    'features', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', f.key,
        'name', f.name,
        'enabled', cf.enabled,
        'settings', cf.settings,
        'updated_by', cf.updated_by)
        order by f.phase, f.key)
      from public.couple_features cf
      join public.features f on f.key = cf.feature_key
      where cf.couple_id = v_couple.id
        and f.key in ('daily_question', 'appreciation_notes', 'micro_challenges', 'mood',
                      'journal', 'story', 'time_capsule')
    ), '[]'::jsonb)
  );
end;
$$;

-- 5. Save shared basics and switches. Either partner can change them later.
--    Only the person who sent the invitation can finish the first setup.
--    Keys that are left out of the payload are not changed.
create or replace function public.save_couple_settings(p_settings jsonb, p_complete boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple public.couples%rowtype;
  v_key text;
  v_value jsonb;
  v_current public.couple_features%rowtype;
  v_zone text := nullif(p_settings ->> 'anchor_time_zone', '');
  v_stage text := nullif(p_settings ->> 'relationship_stage', '');
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_couple from public.couples c where c.id = public.my_couple_id() for update;
  if not found then raise exception 'no_couple'; end if;

  if p_complete and v_couple.partner_1_id <> v_user then
    raise exception 'setup_owner_only';
  end if;
  if v_zone is not null and not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_zone) then
    raise exception 'invalid_time_zone';
  end if;
  if v_stage is not null and v_stage not in ('just_started', 'few_years', 'many_years') then
    raise exception 'invalid_stage';
  end if;

  update public.couples set
    anchor_time_zone = coalesce(v_zone, anchor_time_zone),
    is_long_distance = case when p_settings ? 'is_long_distance'
                            then coalesce((p_settings ->> 'is_long_distance')::boolean, false)
                            else is_long_distance end,
    relationship_stage = case when p_settings ? 'relationship_stage' then v_stage else relationship_stage end,
    has_children = case when p_settings ? 'has_children'
                        then (p_settings ->> 'has_children')::boolean else has_children end,
    is_married = case when p_settings ? 'is_married'
                      then (p_settings ->> 'is_married')::boolean else is_married end,
    anniversary_date = case when p_settings ? 'anniversary_date'
                            then nullif(p_settings ->> 'anniversary_date', '')::date
                            else anniversary_date end,
    setup_completed_at = case when p_complete then now() else setup_completed_at end
  where id = v_couple.id;

  for v_key, v_value in
    select e.key, e.value from jsonb_each(coalesce(p_settings -> 'features', '{}'::jsonb)) as e(key, value)
  loop
    if v_key not in ('daily_question', 'appreciation_notes', 'micro_challenges', 'mood',
                     'journal', 'story', 'time_capsule') then
      raise exception 'unknown_feature';
    end if;

    select * into v_current from public.couple_features cf
    where cf.couple_id = v_couple.id and cf.feature_key = v_key;

    -- A paused switch can only be turned back on by the partner who paused it
    if coalesce((v_value ->> 'enabled')::boolean, false)
       and v_current.enabled = false
       and v_current.updated_by is not null
       and v_current.updated_by <> v_user then
      raise exception 'paused_by_partner';
    end if;

    update public.couple_features cf set
      enabled = coalesce((v_value ->> 'enabled')::boolean, cf.enabled),
      settings = cf.settings || coalesce(v_value -> 'settings', '{}'::jsonb)
    where cf.couple_id = v_couple.id and cf.feature_key = v_key;
  end loop;
end;
$$;

-- 6. Privileges
revoke execute on function public.get_couple_setup() from public, anon;
revoke execute on function public.save_couple_settings(jsonb, boolean) from public, anon;
grant execute on function public.get_couple_setup() to authenticated;
grant execute on function public.save_couple_settings(jsonb, boolean) to authenticated;
