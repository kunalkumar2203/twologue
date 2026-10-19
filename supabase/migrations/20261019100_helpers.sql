-- Migration 1: helpers
-- Shared building blocks used by later migrations.

create extension if not exists pgcrypto with schema extensions;

-- Keeps the updated_at column correct on any table that uses it
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;