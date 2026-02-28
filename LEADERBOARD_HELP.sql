-- Leaderboard view with HELP + bonus rules
-- Scoring:
--  +1 point per correct prediction
--  +1 point per match if pick='HELP' (counts as correct)
--  +BONUS +2 points when user hits ALL matches with results in a round (including HELP)
--
-- Requirements:
--  - predictions: user_id, contest_code, round, match_id, pick
--  - match_results: contest_code, round, match_id, result  ('1','X','2') or NULL if not final

create or replace view public.leaderboard_v as
with round_matches as (
  select
    r.contest_code,
    r.round,
    r.match_id,
    r.result
  from public.match_results r
  where r.result is not null
),
per_round as (
  select
    rm.contest_code,
    p.user_id,
    rm.round,
    count(*) as total_matches_with_results,
    count(*) filter (where p.pick is not null and p.pick <> '') as user_predictions_with_results,
    count(*) filter (
      where (p.pick = rm.result) or (p.pick = 'HELP')
    ) as correct_predictions
  from round_matches rm
  left join public.predictions p
    on p.contest_code = rm.contest_code
   and p.round = rm.round
   and p.match_id = rm.match_id
  group by rm.contest_code, p.user_id, rm.round
),
per_round_scored as (
  select
    contest_code,
    user_id,
    round,
    correct_predictions,
    case
      when total_matches_with_results > 0
       and user_id is not null
       and user_predictions_with_results = total_matches_with_results
       and correct_predictions = total_matches_with_results
      then 1 else 0
    end as bonus_round
  from per_round
  where user_id is not null
)
select
  contest_code,
  user_id,
  sum(correct_predictions)::int as correct_predictions,
  sum(bonus_round)::int as bonus_rounds,
  (sum(correct_predictions) + (sum(bonus_round) * 2))::int as points
from per_round_scored
group by contest_code, user_id;

grant select on public.leaderboard_v to anon, authenticated;
