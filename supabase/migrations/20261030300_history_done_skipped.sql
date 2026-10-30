-- Migration: Shared Challenges and Daily Questions History with Done & Skipped support

-- 1. get_challenge_history: excludes 'shown' actions, deduplicates by date, returns 'saved' or 'skipped'
create or replace function public.get_challenge_history(p_limit int default 50, p_offset int default 0)
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
  select distinct on (h.shown_on)
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
    and h.action in ('saved', 'skipped')
  order by h.shown_on desc, (case when h.action = 'saved' then 1 else 2 end), h.created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.get_challenge_history(int, int) to authenticated;

-- 2. list_daily_question_history: returns both revealed (done) and skipped daily questions
create or replace function public.list_daily_question_history(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_couple uuid := public.my_couple_id();
  v_today date;
begin
  if v_user is null or v_couple is null then raise exception 'not_authenticated'; end if;
  v_today := public.couple_today(v_couple);

  return coalesce((
    select jsonb_agg(x.page order by x.for_date desc)
    from (
      select pi.for_date,
             jsonb_build_object(
               'instance_id', pi.id,
               'for_date', pi.for_date,
               'prompt', pi.copied_text,
               'revealed_at', pi.revealed_at,
               'status', case
                 when pi.status = 'revealed' then 'revealed'
                 when pi.status = 'skipped' then 'skipped'
                 when pi.status = 'open' and pi.for_date < v_today then 'skipped'
                 else 'open'
               end,
               'entries', case
                 when pi.status = 'revealed' then public.journal_entries_json(pi.id, v_user)
                 else '[]'::jsonb
               end
             ) as page
      from public.prompt_instances pi
      where pi.couple_id = v_couple
        and pi.kind = 'daily_question'
        and (pi.status in ('revealed', 'skipped') or (pi.status = 'open' and pi.for_date < v_today))
      order by pi.for_date desc
      limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.list_daily_question_history(int, int) from public, anon;
grant execute on function public.list_daily_question_history(int, int) to authenticated;
