-- Mission sharing for embarkment missions.
--
-- A short numeric code (6 digits) maps to a source mission. When another agent
-- joins via QR scan / code entry / shared link, the source mission's train list
-- is copied into the joining agent's own mission (counters reset to 0).
-- Counters (controlled/refused) remain per-agent.

CREATE TABLE IF NOT EXISTS public.embarkment_share_codes (
  code text PRIMARY KEY,
  mission_id uuid NOT NULL REFERENCES public.embarkment_missions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_embarkment_share_codes_mission
  ON public.embarkment_share_codes(mission_id);
CREATE INDEX IF NOT EXISTS idx_embarkment_share_codes_expires
  ON public.embarkment_share_codes(expires_at);

ALTER TABLE public.embarkment_share_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can SELECT a code (needed to resolve a code → mission
-- when joining). The code itself acts as the secret.
CREATE POLICY "embarkment_share_codes_select_authenticated"
  ON public.embarkment_share_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Only the creator can INSERT a code, and only for a mission they own.
CREATE POLICY "embarkment_share_codes_insert_own"
  ON public.embarkment_share_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = public.get_current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.embarkment_missions m
      WHERE m.id = mission_id
        AND m.agent_id = public.get_current_profile_id()
    )
  );

-- Only the creator can DELETE their own codes (e.g. revoke).
CREATE POLICY "embarkment_share_codes_delete_own"
  ON public.embarkment_share_codes
  FOR DELETE
  TO authenticated
  USING (created_by = public.get_current_profile_id());

-- Helper RPC: resolve a code to its source mission (with trains stripped of counters).
-- Returns the trains to copy into the joining agent's own mission.
-- Returns NULL if the code doesn't exist or has expired.
CREATE OR REPLACE FUNCTION public.resolve_embarkment_share_code(p_code text)
RETURNS TABLE (
  mission_id uuid,
  station_name text,
  mission_date date,
  trains jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS mission_id,
    m.station_name,
    m.mission_date,
    -- Strip counters and per-train comments; keep train identity (number,
    -- origin, destination, time, platform). Generate fresh ids client-side
    -- when copying — but we still emit a placeholder id so the JSON shape is
    -- stable for the client.
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', md5(random()::text || clock_timestamp()::text),
          'trainNumber', t->>'trainNumber',
          'origin', t->>'origin',
          'destination', t->>'destination',
          'departureTime', t->>'departureTime',
          'platform', t->>'platform',
          'controlled', 0,
          'refused', 0,
          'policePresence', false,
          'trackCrossing', false,
          'controlLineCrossing', false,
          'comment', ''
        )
        ORDER BY (t->>'trainNumber')
      )
      FROM jsonb_array_elements(m.trains::jsonb) t
    ), '[]'::jsonb) AS trains
  FROM public.embarkment_share_codes c
  JOIN public.embarkment_missions m ON m.id = c.mission_id
  WHERE c.code = p_code
    AND c.expires_at > now()
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_embarkment_share_code(text) TO authenticated;

-- Helper RPC: generate a unique 6-digit code for a mission.
-- Idempotent — if a non-expired code already exists for the mission and was
-- created by the same agent, it's returned instead of generating a new one.
CREATE OR REPLACE FUNCTION public.create_embarkment_share_code(p_mission_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := public.get_current_profile_id();
  v_existing text;
  v_code text;
  v_attempts int := 0;
BEGIN
  -- Verify ownership of the mission
  IF NOT EXISTS (
    SELECT 1 FROM public.embarkment_missions
    WHERE id = p_mission_id AND agent_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Mission introuvable ou non autorisée';
  END IF;

  -- Reuse an existing valid code if any
  SELECT code INTO v_existing
  FROM public.embarkment_share_codes
  WHERE mission_id = p_mission_id
    AND created_by = v_profile_id
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Generate a fresh 6-digit code, retrying on the (very unlikely) collision
  LOOP
    v_attempts := v_attempts + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

    BEGIN
      INSERT INTO public.embarkment_share_codes (code, mission_id, created_by)
      VALUES (v_code, p_mission_id, v_profile_id);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Impossible de générer un code unique';
      END IF;
      -- otherwise retry
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_embarkment_share_code(uuid) TO authenticated;
