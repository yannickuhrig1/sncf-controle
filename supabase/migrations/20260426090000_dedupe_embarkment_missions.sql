-- Fix duplicate embarkment_missions and prevent future duplicates.
--
-- Context: when an agent reopens the app without an in-memory currentMission,
-- saveMission() previously fell into the INSERT branch and created a new row
-- for the same (agent_id, mission_date, station_name) — leading to duplicate
-- agent rows in the embarkment history view.
--
-- Strategy:
--   1. Merge duplicates per (agent_id, mission_date, station_name): for each
--      train_number, keep the entry with the highest controlled+refused total
--      across the duplicate missions; copy that consolidated train list onto
--      the most recently updated mission row.
--   2. Delete the now-redundant duplicate rows.
--   3. Add a UNIQUE constraint to prevent the bug from re-occurring at the DB
--      level even if client-side logic regresses.

BEGIN;

-- 1) For each (agent_id, mission_date, station_name) duplicate cluster,
--    pick the "winner" row (most recently updated) and consolidate trains.
WITH duplicates AS (
  SELECT
    agent_id,
    mission_date,
    station_name,
    array_agg(id ORDER BY updated_at DESC, created_at DESC) AS ids
  FROM public.embarkment_missions
  GROUP BY agent_id, mission_date, station_name
  HAVING COUNT(*) > 1
),
expanded AS (
  -- Flatten every train of every duplicate row, with a "weight" so we can pick
  -- the most-filled instance of each train number.
  SELECT
    d.agent_id,
    d.mission_date,
    d.station_name,
    d.ids[1] AS winner_id,
    em.id AS source_id,
    em.updated_at AS source_updated_at,
    t AS train,
    COALESCE((t->>'controlled')::int, 0) + COALESCE((t->>'refused')::int, 0) AS weight,
    COALESCE(t->>'trainNumber', '') AS train_number
  FROM duplicates d
  JOIN public.embarkment_missions em
    ON em.agent_id = d.agent_id
   AND em.mission_date = d.mission_date
   AND em.station_name = d.station_name
  CROSS JOIN LATERAL jsonb_array_elements(em.trains::jsonb) AS t
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY winner_id, train_number
      ORDER BY weight DESC, source_updated_at DESC
    ) AS rn
  FROM expanded
),
consolidated AS (
  SELECT
    winner_id,
    jsonb_agg(train ORDER BY train_number) AS merged_trains
  FROM ranked
  WHERE rn = 1
  GROUP BY winner_id
)
UPDATE public.embarkment_missions em
SET
  trains = c.merged_trains,
  updated_at = now()
FROM consolidated c
WHERE em.id = c.winner_id;

-- 2) Delete the loser rows (everything except the winner per cluster).
WITH duplicates AS (
  SELECT
    agent_id,
    mission_date,
    station_name,
    array_agg(id ORDER BY updated_at DESC, created_at DESC) AS ids
  FROM public.embarkment_missions
  GROUP BY agent_id, mission_date, station_name
  HAVING COUNT(*) > 1
),
losers AS (
  SELECT unnest(ids[2:]) AS id FROM duplicates
)
DELETE FROM public.embarkment_missions em
USING losers l
WHERE em.id = l.id;

-- 3) Add the UNIQUE constraint at the DB level.
--    Use a partial unique index to be safe in case station_name is ever NULL.
ALTER TABLE public.embarkment_missions
  ADD CONSTRAINT embarkment_missions_agent_date_station_unique
  UNIQUE (agent_id, mission_date, station_name);

COMMIT;
