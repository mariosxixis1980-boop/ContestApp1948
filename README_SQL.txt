CMP Correct Fix (1X2) – Match IDs + Leaderboard

Τι φτιάχνει:
- Ο Admin όταν πατά “Save τελικό (1/X/2)” γράφει ΚΑΙ στο Supabase table: public.match_results
- Χρησιμοποιεί το ΙΔΙΟ match_id που έχουν οι προβλέψεις (m_....) => δεν υπάρχει πλέον mismatch τύπου M1.

Τι πρέπει να υπάρχει στη βάση (SQL):

1) match_results table (αν υπάρχει ήδη, απλά επιβεβαίωσε columns):
create table if not exists public.match_results (
  contest_code text not null,
  round integer not null,
  match_id text not null,
  result text check (result in ('1','X','2')),
  home_ft integer,
  away_ft integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (contest_code, round, match_id)
);

2) RLS (read για όλους τους logged-in, write μόνο admin):
alter table public.match_results enable row level security;

drop policy if exists "match_results_read" on public.match_results;
create policy "match_results_read"
on public.match_results for select
to authenticated
using (true);

drop policy if exists "match_results_write_admin" on public.match_results;
create policy "match_results_write_admin"
on public.match_results for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

3) Leaderboard view (3 πόντοι ανά σωστή πρόβλεψη):
create or replace view public.leaderboard as
select
  p.contest_code,
  p.user_id,
  count(*) filter (where p.pick = r.result) as correct_predictions,
  count(*) as total_predictions,
  (count(*) filter (where p.pick = r.result)) * 3 as points
from public.predictions p
join public.match_results r
  on r.contest_code = p.contest_code
 and r.round = p.round
 and r.match_id = p.match_id
group by p.contest_code, p.user_id;

Σημείωση:
- Οι βαθμοί θα εμφανίζονται ΜΟΝΟ για αγώνες που έχουν αποτέλεσμα στο match_results.
- Το “clear history” δεν θα σβήσει τίποτα, γιατί όλα είναι στη βάση.
