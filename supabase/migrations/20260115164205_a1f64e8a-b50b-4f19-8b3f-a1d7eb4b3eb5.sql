-- Fix privilege escalation and team boundary issues

-- 1. Drop the current update policies that don't restrict sensitive fields
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- 2. Create a more restrictive UPDATE policy for regular users
-- Users can only update non-sensitive fields (not role or team_id)
-- We'll handle this by ensuring only admins can change role/team_id via the admin policy
CREATE POLICY "profiles_update_own_safe" ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid() AND NOT is_admin())
WITH CHECK (
  user_id = auth.uid() 
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND team_id IS NOT DISTINCT FROM (SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 3. Ensure controls INSERT validates that team_id matches agent's actual team
DROP POLICY IF EXISTS "controls_insert" ON public.controls;

CREATE POLICY "controls_insert_validated" ON public.controls
FOR INSERT WITH CHECK (
  is_admin() OR (
    agent_id = get_current_profile_id() 
    AND (team_id IS NULL OR team_id = get_user_team_id())
  )
);

-- 4. Ensure controls UPDATE also validates team_id consistency
DROP POLICY IF EXISTS "controls_update" ON public.controls;

CREATE POLICY "controls_update_validated" ON public.controls
FOR UPDATE 
USING (agent_id = get_current_profile_id() OR is_admin())
WITH CHECK (
  is_admin() OR (
    agent_id = get_current_profile_id() 
    AND (team_id IS NULL OR team_id = get_user_team_id())
  )
);