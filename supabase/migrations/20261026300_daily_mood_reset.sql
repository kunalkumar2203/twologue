-- Daily mood reset: update partner_mood view to only return moods updated within the last 24 hours
-- and ensure updated_at is properly indexed for rapid filtering.

create index if not exists idx_daily_moods_couple_user_updated
  on public.daily_moods (couple_id, user_id, updated_at desc);

create or replace view public.partner_mood
with (security_invoker = true)
as
select m.id, m.couple_id, m.user_id, m.icon, m.label, m.note, m.private, m.created_at, m.updated_at
from public.daily_moods m
where m.user_id = (select public.my_partner_id())
  and m.updated_at >= now() - interval '24 hours';

grant select on public.partner_mood to authenticated;
