-- Migration 8: landing page waitlist
-- Kept separate from product accounts. The app can't read this table at all.
-- The only way in is the join_waitlist function, which anyone (signed in or not) may call.

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  launch_email_sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.waitlist_signups
  for each row execute function public.set_updated_at();

-- No policies and no grants: nobody can read or write the table directly
alter table public.waitlist_signups enable row level security;
revoke all on public.waitlist_signups from anon, authenticated;

-- Adds an email. Signing up twice does nothing, so the answer never reveals who is already on the list.
-- Someone who had unsubscribed and signs up again goes back to pending.
create or replace function public.join_waitlist(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  insert into public.waitlist_signups (email) values (v_email)
  on conflict (email) do update
    set status = 'pending', unsubscribed_at = null, consent_at = now()
    where public.waitlist_signups.status = 'unsubscribed';
end;
$$;

revoke execute on function public.join_waitlist(text) from public;
grant execute on function public.join_waitlist(text) to anon, authenticated;