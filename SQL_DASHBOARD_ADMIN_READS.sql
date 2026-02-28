-- ✅ Needed so Dashboard can read finals and Admin can read who bought HELP
-- Run in Supabase SQL Editor

-- 1) match_results: allow authenticated users to read finals (display-only)
alter table if exists public.match_results enable row level security;

drop policy if exists "match_results read" on public.match_results;
create policy "match_results read"
on public.match_results
for select
to anon, authenticated
using (true);

-- 2) help_purchases: allow ADMIN to read all purchases (for admin page)
alter table if exists public.help_purchases enable row level security;

drop policy if exists "help_purchases admin read" on public.help_purchases;
create policy "help_purchases admin read"
on public.help_purchases
for select
to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.is_admin = true
));

-- (Users still can read their own help row if you already have that policy; keep it.
-- If you don't have it, add it below.)

drop policy if exists "help_purchases read own" on public.help_purchases;
create policy "help_purchases read own"
on public.help_purchases
for select
to authenticated
using (user_id = auth.uid());
