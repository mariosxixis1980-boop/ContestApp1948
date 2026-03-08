-- RUN THIS IN SUPABASE SQL EDITOR (public schema)

-- 1) Ensure profiles has help_credits (int)
alter table public.profiles
  add column if not exists help_credits int4 not null default 0;

-- 2) Ensure help_purchases has needed columns + unique per contest
alter table public.help_purchases
  add column if not exists credits_granted int4 not null default 3;

alter table public.help_purchases
  add column if not exists remaining int4 not null default 3;

alter table public.help_purchases
  add column if not exists used_match_ids uuid[] not null default '{}';

alter table public.help_purchases
  add column if not exists stripe_session_id text;

create unique index if not exists help_purchases_user_contest_uniq
  on public.help_purchases(user_id, contest_code);

create unique index if not exists help_purchases_stripe_session_uniq
  on public.help_purchases(stripe_session_id)
  where stripe_session_id is not null;

-- 3) RPC: grant credits once per (user,contest) (atomic)
create or replace function public.grant_help_for_contest(
  p_user uuid,
  p_contest_code text,
  p_session_id text,
  p_credits int4 default 3
)
returns table (
  granted boolean,
  already_purchased boolean,
  help_credits int4
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_row boolean := false;
begin
  insert into public.help_purchases(
    user_id, contest_code, stripe_session_id, credits_granted, remaining, used_match_ids
  ) values (
    p_user, p_contest_code, p_session_id, p_credits, p_credits, '{}'
  )
  on conflict (user_id, contest_code) do nothing;

  inserted_row := found;

  if inserted_row then
    update public.profiles
      set help_credits = coalesce(help_credits,0) + p_credits
      where id = p_user
      returning help_credits into help_credits;

    granted := true;
    already_purchased := false;
  else
    select coalesce(help_credits,0) into help_credits
      from public.profiles
      where id = p_user;

    granted := false;
    already_purchased := true;
  end if;

  return next;
end;
$$;

grant execute on function public.grant_help_for_contest(uuid, text, text, int4) to authenticated;

-- 4) RLS (optional but recommended)
alter table public.help_purchases enable row level security;

drop policy if exists "help_purchases_select_own" on public.help_purchases;
create policy "help_purchases_select_own"
on public.help_purchases for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "help_purchases_insert_own" on public.help_purchases;
create policy "help_purchases_insert_own"
on public.help_purchases for insert
to authenticated
with check (user_id = auth.uid());
