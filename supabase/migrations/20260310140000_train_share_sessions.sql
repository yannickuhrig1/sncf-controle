-- Partage privé des trains du jour par code de session

-- Tables créées dans l'ordre (pas de référence croisée dans les contraintes)
CREATE TABLE IF NOT EXISTS public.train_share_sessions (
  code      text        PRIMARY KEY,
  owner_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      date        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.train_share_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.train_share_members (
  code     text NOT NULL REFERENCES public.train_share_sessions(code) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);
ALTER TABLE public.train_share_members ENABLE ROW LEVEL SECURITY;

-- Politiques train_share_sessions
CREATE POLICY "train_share_sessions_select"
  ON public.train_share_sessions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR code IN (
    SELECT code FROM public.train_share_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "train_share_sessions_insert"
  ON public.train_share_sessions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "train_share_sessions_delete"
  ON public.train_share_sessions FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Politiques train_share_members
CREATE POLICY "train_share_members_select"
  ON public.train_share_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR code IN (
    SELECT code FROM public.train_share_sessions WHERE owner_id = auth.uid()
  ));

CREATE POLICY "train_share_members_insert"
  ON public.train_share_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "train_share_members_delete"
  ON public.train_share_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR code IN (
    SELECT code FROM public.train_share_sessions WHERE owner_id = auth.uid()
  ));

-- Colonne share_code sur daily_trains
ALTER TABLE public.daily_trains ADD COLUMN IF NOT EXISTS share_code text
  REFERENCES public.train_share_sessions(code) ON DELETE SET NULL;

-- Mettre à jour la politique SELECT pour le partage privé par code
DROP POLICY IF EXISTS "daily_trains_select" ON public.daily_trains;

CREATE POLICY "daily_trains_select"
  ON public.daily_trains FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      shared = true
      AND share_code IS NOT NULL
      AND share_code IN (
        SELECT tsm.code FROM public.train_share_members tsm WHERE tsm.user_id = auth.uid()
        UNION
        SELECT tss.code FROM public.train_share_sessions tss WHERE tss.owner_id = auth.uid()
      )
    )
  );
