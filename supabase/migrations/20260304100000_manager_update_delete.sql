-- Permettre aux managers de modifier/supprimer les contrôles de leur équipe
-- Précédemment, seuls les agents (leurs propres) et les admins pouvaient modifier/supprimer

DROP POLICY IF EXISTS "controls_update" ON public.controls;
DROP POLICY IF EXISTS "controls_delete" ON public.controls;
DROP POLICY IF EXISTS "controls_update_validated" ON public.controls;

-- UPDATE : agent (le sien) OU admin (tous) OU manager (son équipe)
CREATE POLICY "controls_update" ON public.controls
FOR UPDATE TO authenticated
USING (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
    OR (public.is_manager() AND team_id = public.get_user_team_id())
)
WITH CHECK (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
    OR (public.is_manager() AND team_id = public.get_user_team_id())
);

-- DELETE : agent (le sien) OU admin (tous) OU manager (son équipe)
CREATE POLICY "controls_delete" ON public.controls
FOR DELETE TO authenticated
USING (
    agent_id = public.get_current_profile_id()
    OR public.is_admin()
    OR (public.is_manager() AND team_id = public.get_user_team_id())
);
