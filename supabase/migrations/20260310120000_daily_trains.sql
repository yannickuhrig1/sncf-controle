-- Table des trains du jour — synchronisée entre appareils
CREATE TABLE IF NOT EXISTS public.daily_trains (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL,
  train_number text        NOT NULL,
  train_info   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, train_number)
);

ALTER TABLE public.daily_trains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_trains_user_all"
  ON public.daily_trains
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
