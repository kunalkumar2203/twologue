-- Store the profile details collected during signup.

alter table public.profiles
  add column gender text not null default 'prefer_not_to_say',
  add column age smallint;

alter table public.profiles
  add constraint profiles_age_valid check (age is null or age between 16 and 120);

alter table public.profiles
  add constraint profiles_gender_valid check (gender in ('woman', 'man', 'non_binary', 'self_described', 'prefer_not_to_say'));

grant update (display_name, gender, age, avatar_path, time_zone, language, onboarding_completed_at)
  on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_tz text;
  v_gender text;
  v_age smallint;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  v_tz := coalesce(nullif(new.raw_user_meta_data ->> 'time_zone', ''), 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_tz) then
    v_tz := 'UTC';
  end if;

  v_gender := coalesce(nullif(new.raw_user_meta_data ->> 'gender', ''), 'prefer_not_to_say');
  if v_gender not in ('woman', 'man', 'non_binary', 'self_described', 'prefer_not_to_say') then
    v_gender := 'prefer_not_to_say';
  end if;

  begin
    v_age := (new.raw_user_meta_data ->> 'age')::smallint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    v_age := null;
  end;
  if v_age is not null and (v_age < 16 or v_age > 120) then
    v_age := null;
  end if;

  insert into public.profiles (id, display_name, gender, age, time_zone)
  values (new.id, v_name, v_gender, v_age, v_tz);
  insert into public.user_settings (user_id) values (new.id);
  perform public.create_solo_couple(new.id);

  return new;
end;
$$;
