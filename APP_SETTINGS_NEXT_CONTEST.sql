-- Persist "Next Contest start" banner across browser clear history by storing it in Supabase.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('next_contest', jsonb_build_object('starts_at', null))
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

-- Allow anyone to read (needed on login page before auth)
drop policy if exists "app_settings read" on public.app_settings;
create policy "app_settings read"
on public.app_settings
for select
to anon, authenticated
using (true);

-- Allow only admins to update (expects profiles.is_admin boolean)
drop policy if exists "app_settings admin write" on public.app_settings;
create policy "app_settings admin write"
on public.app_settings
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);
