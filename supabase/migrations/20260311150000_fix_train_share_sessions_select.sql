-- Fix: allow any authenticated user to look up a session by code
-- (needed to validate the code before joining)
DROP POLICY IF EXISTS "train_share_sessions_select" ON public.train_share_sessions;

CREATE POLICY "train_share_sessions_select"
  ON public.train_share_sessions FOR SELECT TO authenticated
  USING (true);
