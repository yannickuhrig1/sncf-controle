-- Fix security issue: admin_settings table publicly readable
-- Change the permissive SELECT policy to require authentication
DROP POLICY IF EXISTS "admin_settings_read" ON public.admin_settings;

CREATE POLICY "admin_settings_read" 
ON public.admin_settings 
AS RESTRICTIVE
FOR SELECT 
USING (auth.uid() IS NOT NULL);