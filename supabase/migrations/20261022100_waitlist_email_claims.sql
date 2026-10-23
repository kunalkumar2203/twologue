-- Waitlist email delivery state and server-only claim helpers.

alter table public.waitlist_signups
  add column confirmation_attempted_at timestamptz;

create or replace function public.claim_waitlist_confirmation(p_email text)
returns table (email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.waitlist_signups
  set confirmation_attempted_at = now()
  where waitlist_signups.email = lower(btrim(coalesce(p_email, '')))
    and confirmation_sent_at is null
    and (
      confirmation_attempted_at is null
      or confirmation_attempted_at < now() - interval '15 minutes'
    )
  returning waitlist_signups.email;
end;
$$;

create or replace function public.mark_waitlist_confirmation_sent(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.waitlist_signups
  set confirmation_sent_at = now()
  where email = lower(btrim(coalesce(p_email, '')))
    and confirmation_sent_at is null;
$$;

revoke execute on function public.claim_waitlist_confirmation(text) from public, anon, authenticated;
revoke execute on function public.mark_waitlist_confirmation_sent(text) from public, anon, authenticated;
