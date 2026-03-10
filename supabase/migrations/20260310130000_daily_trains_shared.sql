-- Ajout du partage d'équipe sur les trains du jour
ALTER TABLE public.daily_trains ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "daily_trains_user_all" ON public.daily_trains;

CREATE POLICY "daily_trains_select"
  ON public.daily_trains FOR SELECT
  USING (auth.uid() = user_id OR shared = true);

CREATE POLICY "daily_trains_insert"
  ON public.daily_trains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_trains_update"
  ON public.daily_trains FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_trains_delete"
  ON public.daily_trains FOR DELETE
  USING (auth.uid() = user_id);
