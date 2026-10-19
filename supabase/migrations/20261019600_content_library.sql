-- Migration 6: content library
-- All predefined content (questions, challenges, prompts, games, ideas) lives in one table.
-- It is filled by a seed script, not by the app. Users can only read published items.

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,   -- stable id from the content dictionary, for example "dq-001"
  type text not null check (type in (
    'daily_question', 'challenge', 'journal_prompt', 'story_starter',
    'know_me', 'quick_game', 'bucket_idea', 'date_idea'
  )),
  body text not null,
  options jsonb not null default '{}'::jsonb,  -- type-specific details, like game choices or date filters
  depth text check (depth in ('light', 'medium', 'deep')),
  mood text,
  tags text[] not null default '{}',
  spicy boolean not null default false,
  language text not null default 'en',
  status text not null default 'published' check (status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_type_status_idx on public.content_items (type, status);
create index content_items_tags_idx on public.content_items using gin (tags);

-- What each couple has seen. The text is copied, so later edits never change history.
create table public.couple_content_history (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  content_id uuid references public.content_items (id) on delete set null,
  content_type text not null,
  copied_text text not null,
  shown_on date not null,
  action text not null check (action in ('shown', 'swapped', 'skipped', 'saved', 'vetoed')),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index couple_content_history_couple_idx
  on public.couple_content_history (couple_id, content_type, shown_on desc);

create trigger set_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

alter table public.content_items enable row level security;
alter table public.couple_content_history enable row level security;

revoke all on public.content_items, public.couple_content_history from anon, authenticated;

create policy "content_items_select_published" on public.content_items
  for select to authenticated using (status = 'published');
grant select on public.content_items to authenticated;

-- History is read-only for the app. Rows are added by functions (daily assignment, swap).
create policy "couple_content_history_select_members" on public.couple_content_history
  for select to authenticated using (public.is_couple_member(couple_id));
grant select on public.couple_content_history to authenticated;