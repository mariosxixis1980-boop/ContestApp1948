-- CMP Leaderboard + Help Scoring
-- Κανόνες:
-- 1 σωστό = 1 βαθμός
-- BONUS +2 αν όλα τα ON παιχνίδια είναι σωστά (ή έχουν HELP)
-- OFF χωρίς HELP = 0
-- HELP σε match = 1 βαθμός ό,τι κι αν γίνει (ακόμα και OFF)
-- HELP αγορά 1 φορά ανά contest (user_id + contest_code unique), 3 χρήσεις/contest

begin;

-- 1) help_purchases: σιγουρεύουμε columns
alter table if exists public.help_purchases
  add column if not exists purchased_at timestamptz,
  add column if not exists remaining int4 default 3,
  add column if not exists used_match_ids text[] default '{}',
  add column if not exists updated_at timestamptz;

-- 2) Unique (ONE purchase per contest)
create unique index if not exists help_purchases_user_contest_uq
on public.help_purchases (user_id, contest_code);

-- 3) match_results: σιγουρεύουμε columns για scoring
alter table if exists public.match_results
  add column if not exists contest_code text,
  add column if not exists round int4,
  add column if not exists match_id text,
  add column if not exists result text,
  add column if not exists is_off boolean default false;

-- 4) Views

drop view if exists public.leaderboard_contest_v;
create view public.leaderboard_contest_v as
with base as (
  select
    mr.contest_code,
    mr.round,
    mr.match_id,
    coalesce(mr.is_off,false) as is_off,
    mr.result,
    p.user_id,
    p.pick,
    coalesce(hp.used_match_ids, '{}'::text[]) as used_match_ids
  from public.match_results mr
  join public.predictions p
    on p.contest_code = mr.contest_code
   and p.round = mr.round
   and p.match_id = mr.match_id
  left join public.help_purchases hp
    on hp.user_id = p.user_id
   and hp.contest_code = p.contest_code
),
per_match as (
  select
    contest_code,
    user_id,
    match_id,
    is_off,
    result,
    pick,
    (match_id = any(used_match_ids)) as help_used,
    case
      when (match_id = any(used_match_ids)) then 1
      when is_off then 0
      when result is null then 0
      when pick = result then 1
      else 0
    end as pts,
    case
      when (match_id = any(used_match_ids)) then 1 else 0 end as help_pts,
    case
      when (not is_off) and result is not null and (pick = result) then 1 else 0 end as correct_flag,
    case
      when is_off and not (match_id = any(used_match_ids)) then 1 else 0 end as off_no_help
  from base
),
agg as (
  select
    contest_code,
    user_id,
    sum(pts)::int as base_points,
    sum(correct_flag)::int as correct_predictions,
    sum(help_pts)::int as help_points,
    sum(off_no_help)::int as off_matches_no_help,
    count(*) filter (where not is_off and result is not null) as on_with_result,
    count(*) filter (where not is_off and result is not null and (help_used or pick = result)) as on_satisfied
  from per_match
  group by contest_code, user_id
)
select
  contest_code,
  user_id,
  (base_points + case when on_with_result > 0 and on_satisfied = on_with_result then 2 else 0 end)::int as points,
  correct_predictions,
  help_points,
  off_matches_no_help,
  (case when on_with_result > 0 and on_satisfied = on_with_result then 2 else 0 end)::int as bonus_points
from agg;

drop view if exists public.leaderboard_total_v;
create view public.leaderboard_total_v as
select
  user_id,
  sum(points)::int as total_points
from public.leaderboard_contest_v
group by user_id;

commit;
