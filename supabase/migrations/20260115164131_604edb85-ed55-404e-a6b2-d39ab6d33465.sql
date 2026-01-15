-- Fix RLS to properly block unauthenticated access
-- RESTRICTIVE policies only filter authenticated users - we need PERMISSIVE policies to require auth

-- PROFILES TABLE: Add permissive policy requiring authentication for all operations
CREATE POLICY "profiles_require_auth" ON public.profiles
FOR ALL USING (auth.uid() IS NOT NULL);

-- CONTROLS TABLE: Add permissive policy requiring authentication for all operations  
CREATE POLICY "controls_require_auth" ON public.controls
FOR ALL USING (auth.uid() IS NOT NULL);

-- TEAMS TABLE: Add permissive policy requiring authentication for all operations
CREATE POLICY "teams_require_auth" ON public.teams
FOR ALL USING (auth.uid() IS NOT NULL);