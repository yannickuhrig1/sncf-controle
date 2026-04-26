-- Service day = imported Pacific Web tournée for a given agent + date.
-- See useServiceDays.ts and PacificWebParser.ts for client usage.

CREATE TABLE IF NOT EXISTS public.service_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  service_date date NOT NULL,
  code_journee text NOT NULL,
  raw_text text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_days_agent_date
  ON public.service_days(agent_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_days_code
  ON public.service_days(agent_id, code_journee, service_date DESC);

CREATE OR REPLACE FUNCTION public.touch_service_days_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_days_touch ON public.service_days;
CREATE TRIGGER trg_service_days_touch
  BEFORE UPDATE ON public.service_days
  FOR EACH ROW EXECUTE FUNCTION public.touch_service_days_updated_at();

ALTER TABLE public.service_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_days_select_own"
  ON public.service_days FOR SELECT TO authenticated
  USING (agent_id = public.get_current_profile_id());

CREATE POLICY "service_days_insert_own"
  ON public.service_days FOR INSERT TO authenticated
  WITH CHECK (agent_id = public.get_current_profile_id());

CREATE POLICY "service_days_update_own"
  ON public.service_days FOR UPDATE TO authenticated
  USING (agent_id = public.get_current_profile_id())
  WITH CHECK (agent_id = public.get_current_profile_id());

CREATE POLICY "service_days_delete_own"
  ON public.service_days FOR DELETE TO authenticated
  USING (agent_id = public.get_current_profile_id());
