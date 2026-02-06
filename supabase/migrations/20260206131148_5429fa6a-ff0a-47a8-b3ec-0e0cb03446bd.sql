-- Fix RLS policies: require_auth should be PERMISSIVE to allow base authenticated access
-- Other policies are RESTRICTIVE to enforce specific access rules

-- Drop and recreate require_auth as PERMISSIVE
DROP POLICY IF EXISTS embarkment_missions_require_auth ON public.embarkment_missions;
CREATE POLICY "embarkment_missions_require_auth"
ON public.embarkment_missions
AS PERMISSIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Recreate insert policy as PERMISSIVE (to work with the permissive require_auth)
DROP POLICY IF EXISTS embarkment_missions_insert ON public.embarkment_missions;
CREATE POLICY "embarkment_missions_insert"
ON public.embarkment_missions
AS PERMISSIVE
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() OR (
      (agent_id = get_current_profile_id()) AND 
      ((team_id IS NULL) OR (team_id = get_user_team_id()))
    )
  )
);

-- Recreate update policy as PERMISSIVE
DROP POLICY IF EXISTS embarkment_missions_update ON public.embarkment_missions;
CREATE POLICY "embarkment_missions_update"
ON public.embarkment_missions
AS PERMISSIVE
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    (agent_id = get_current_profile_id()) OR is_admin()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin() OR (
      (agent_id = get_current_profile_id()) AND 
      ((team_id IS NULL) OR (team_id = get_user_team_id()))
    )
  )
);

-- Recreate select policy as PERMISSIVE
DROP POLICY IF EXISTS embarkment_missions_select ON public.embarkment_missions;
CREATE POLICY "embarkment_missions_select"
ON public.embarkment_missions
AS PERMISSIVE
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin() OR 
    (agent_id = get_current_profile_id()) OR 
    (is_manager() AND (team_id = get_user_team_id()))
  )
);

-- Recreate delete policy as PERMISSIVE
DROP POLICY IF EXISTS embarkment_missions_delete ON public.embarkment_missions;
CREATE POLICY "embarkment_missions_delete"
ON public.embarkment_missions
AS PERMISSIVE
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    (agent_id = get_current_profile_id()) OR is_admin()
  )
);