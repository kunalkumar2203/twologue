-- Migration 10: couple-scoped appreciation notes

create table public.appreciation_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  template text not null check (char_length(template) <= 120),
  body text not null check (char_length(body) between 1 and 500),
  emoji text check (char_length(emoji) <= 16),
  photo_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint appreciation_notes_different_people check (sender_id <> recipient_id)
);

create index appreciation_notes_recipient_idx
  on public.appreciation_notes (recipient_id, created_at desc);
create index appreciation_notes_couple_idx
  on public.appreciation_notes (couple_id, created_at desc);

alter table public.appreciation_notes enable row level security;
revoke all on public.appreciation_notes from anon, authenticated;

create policy "appreciation_notes_select_participants" on public.appreciation_notes
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "appreciation_notes_insert_sender" on public.appreciation_notes
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_couple_member(couple_id)
    and public.is_couple_member(couple_id)
    and recipient_id = (select public.my_partner_id())
  );
create policy "appreciation_notes_update_recipient" on public.appreciation_notes
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

grant select on public.appreciation_notes to authenticated;
grant insert (couple_id, sender_id, recipient_id, template, body, emoji, photo_path)
  on public.appreciation_notes to authenticated;
grant update (read_at) on public.appreciation_notes to authenticated;

create or replace function public.send_appreciation_note(
  p_template text,
  p_body text,
  p_emoji text default null,
  p_photo_path text default null
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
  v_id uuid;
begin
  if v_user is null or v_couple is null or v_partner is null then
    raise exception 'You need a partner before sending a note.';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 500 then
    raise exception 'Notes need 1 to 500 characters.';
  end if;
  if char_length(coalesce(p_template, '')) > 120 then raise exception 'Note template is too long.'; end if;

  insert into public.appreciation_notes
    (couple_id, sender_id, recipient_id, template, body, emoji, photo_path)
  values
    (v_couple, v_user, v_partner, btrim(coalesce(p_template, '')), btrim(p_body), nullif(btrim(p_emoji), ''), p_photo_path)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_appreciation_notes(p_scope text default 'received')
returns table (
  id uuid,
  from_name text,
  template text,
  body text,
  emoji text,
  created_at timestamptz,
  read boolean,
  sent_by_me boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select n.id,
         coalesce(p.display_name, 'Your partner') as from_name,
         n.template,
         n.body,
         n.emoji,
         n.created_at,
         (n.read_at is not null) as read,
         (n.sender_id = (select auth.uid())) as sent_by_me
  from public.appreciation_notes n
  join public.profiles p on p.id = n.sender_id
  where public.is_couple_member(n.couple_id)
    and (
      (p_scope = 'received' and n.recipient_id = (select auth.uid()))
      or (p_scope = 'sent' and n.sender_id = (select auth.uid()))
    )
  order by n.created_at desc;
$$;

create or replace function public.mark_appreciation_note_read(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.appreciation_notes
  set read_at = coalesce(read_at, now())
  where id = p_note_id and recipient_id = (select auth.uid());
end;
$$;

grant execute on function public.send_appreciation_note(text, text, text, text) to authenticated;
grant execute on function public.get_appreciation_notes(text) to authenticated;
grant execute on function public.mark_appreciation_note_read(uuid) to authenticated;
