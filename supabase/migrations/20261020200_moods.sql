-- Couple-scoped emotional weather. Apply after the couple schema migrations.

create table public.daily_moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  icon text not null check (char_length(icon) <= 8),
  label text not null check (char_length(label) <= 40),
  note text not null default '' check (char_length(note) <= 120),
  private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id)
);

alter table public.daily_moods enable row level security;
revoke all on public.daily_moods from anon, authenticated;

create policy "daily_moods_select_members" on public.daily_moods
  for select to authenticated
  using (public.is_couple_member(couple_id) and (private = false or user_id = (select auth.uid())));
create policy "daily_moods_update_owner" on public.daily_moods
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_couple_member(couple_id))
  with check (user_id = (select auth.uid()) and public.is_couple_member(couple_id));
grant select on public.daily_moods to authenticated;

create or replace view public.partner_mood
with (security_invoker = true)
as
select m.id, m.couple_id, m.user_id, m.icon, m.label, m.note, m.private, m.created_at, m.updated_at
from public.daily_moods m
where m.user_id = (select public.my_partner_id());

grant select on public.partner_mood to authenticated;

create or replace function public.set_my_mood(
  p_icon text,
  p_label text,
  p_note text default '',
  p_private boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
begin
  if v_user is null or v_couple is null then raise exception 'no_couple'; end if;
  insert into public.daily_moods (couple_id, user_id, icon, label, note, private)
  values (v_couple, v_user, btrim(p_icon), btrim(p_label), btrim(coalesce(p_note, '')), coalesce(p_private, false))
  on conflict (couple_id, user_id) do update
    set icon = excluded.icon, label = excluded.label, note = excluded.note,
        private = excluded.private, updated_at = now();
end;
$$;

create or replace function public.clear_my_mood()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.daily_moods
  where user_id = (select auth.uid()) and couple_id = public.my_couple_id();
$$;

revoke all on function public.set_my_mood(text, text, text, boolean) from public, anon;
revoke all on function public.clear_my_mood() from public, anon;
grant execute on function public.set_my_mood(text, text, text, boolean) to authenticated;
grant execute on function public.clear_my_mood() to authenticated;
