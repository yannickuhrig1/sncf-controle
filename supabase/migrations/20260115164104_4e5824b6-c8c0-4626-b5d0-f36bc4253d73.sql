-- Fix security issues in profiles table RLS policies

-- 1. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- 2. Create a properly scoped SELECT policy
-- Users can see their own profile, admins can see all, managers can see their team
CREATE POLICY "profiles_select_own_or_team" ON public.profiles
FOR SELECT USING (
  user_id = auth.uid() 
  OR is_admin() 
  OR (is_manager() AND team_id = get_user_team_id())
);

-- 3. Add INSERT policy for self-registration (handled by trigger) and admins
CREATE POLICY "profiles_insert_self_or_admin" ON public.profiles
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR is_admin()
);

-- 4. Add DELETE policy for admins to properly manage profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
FOR DELETE USING (is_admin());