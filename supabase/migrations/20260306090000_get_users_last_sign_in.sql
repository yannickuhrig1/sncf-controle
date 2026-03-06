-- Fonction pour lire la dernière connexion de tous les utilisateurs depuis auth.users
-- Accessible aux admins et managers via SECURITY DEFINER (bypasse RLS sur auth.users)
CREATE OR REPLACE FUNCTION public.get_users_last_sign_in()
RETURNS TABLE(user_id UUID, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_manager()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT id, auth.users.last_sign_in_at FROM auth.users;
END;
$$;
