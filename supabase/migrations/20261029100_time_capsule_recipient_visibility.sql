-- Migration: Make sealed time capsule letters visible to the recipient

create or replace function public.list_time_capsules()
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
  if not public.is_feature_enabled(v_couple, 'time_capsule') then return null; end if;

  v_today := public.couple_today(v_couple);

  return (
    select jsonb_build_object(
      'couple_id', v_couple,
      'today', v_today,
      'has_partner', public.my_partner_id() is not null,
      'partner_name', coalesce(
        (select nullif(p.display_name, '') from public.profiles p where p.id = public.my_partner_id()),
        'Your partner'),
      'anniversary_date', (select c.anniversary_date from public.couples c where c.id = v_couple),
      'capsules', coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'audience', x.audience,
        'occasion', x.occasion,
        'sealed_on', x.sealed_on,
        'unlock_on', x.unlock_on,
        'days_left', greatest(x.unlock_on - v_today, 0),
        'is_mine', x.is_mine,
        'author_name', x.author_name,
        'recipient_name', x.recipient_name,
        'readable', x.readable,
        'ready_to_open', x.readable and not x.opened,
        'body', case when x.readable and x.opened then x.body end
      ) order by x.unlock_on), '[]'::jsonb)
    )
    from (
      select t.id, t.title, t.audience, t.occasion, t.sealed_on, t.unlock_on, t.body,
             t.author_id = v_user as is_mine,
             case when t.author_id = v_user then 'You'
                  else coalesce(nullif(a.display_name, ''), 'Your partner') end as author_name,
             coalesce(nullif(r.display_name, ''), 'Your partner') as recipient_name,
             (t.audience = 'joint' or t.recipient_id = v_user) and v_today >= t.unlock_on as readable,
             (o.capsule_id is not null) as opened
      from public.time_capsules t
      join public.profiles a on a.id = t.author_id
      left join public.profiles r on r.id = t.recipient_id
      left join public.time_capsule_opens o on o.capsule_id = t.id and o.user_id = v_user
      where t.couple_id = v_couple
    ) x
  );
end;
$$;

revoke execute on function public.list_time_capsules() from public, anon;
grant execute on function public.list_time_capsules() to authenticated;
