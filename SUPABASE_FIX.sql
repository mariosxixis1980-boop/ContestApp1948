-- Run this in Supabase SQL Editor (Primary Database)
-- Fix trigger function that referenced a non-existent column "round" on contests.
-- Keeps meta.round -> current_round in sync.

create or replace function public.contests_sync_round()
returns trigger
language plpgsql
as $$
declare
  meta_round int;
begin
  meta_round := null;

  if new.meta is not null and (new.meta ? 'round') then
    begin
      meta_round := (new.meta->>'round')::int;
    exception when others then
      meta_round := null;
    end;
  end if;

  if meta_round is not null then
    new.current_round := coalesce(new.current_round, meta_round, 1);
  else
    new.current_round := coalesce(new.current_round, 1);
  end if;

  return new;
end;
$$;

-- If your trigger already exists, it will keep using this function.
-- If it was deleted, recreate it with:
-- drop trigger if exists trg_contests_sync_round on public.contests;
-- create trigger trg_contests_sync_round
--   before insert or update on public.contests
--   for each row execute function public.contests_sync_round();
