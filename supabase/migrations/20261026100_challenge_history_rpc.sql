-- Migration: get_challenge_history RPC
-- Queries couple_content_history joined with content_items and couple_challenge_days

create or replace function public.get_challenge_history(p_limit int default 20, p_offset int default 0)
returns table (
  id uuid,
  shown_on date,
  action text,
  body text,
  category text,
  duration_label text,
  note text,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    h.id,
    h.shown_on,
    h.action,
    h.copied_text as body,
    coalesce(ci.options ->> 'category', 'reflection') as category,
    coalesce(ci.options ->> 'duration_label', '2 min') as duration_label,
    coalesce(d.note, '') as note,
    h.created_at as updated_at
  from public.couple_content_history h
  left join public.content_items ci on ci.id = h.content_id
  left join public.couple_challenge_days d
    on d.couple_id = h.couple_id and d.for_date = h.shown_on
  where h.couple_id = public.my_couple_id()
    and h.content_type = 'challenge'
  order by h.shown_on desc, h.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.get_challenge_history(int, int) to authenticated;
