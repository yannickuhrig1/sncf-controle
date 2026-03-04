-- Fonction pour lire l'email d'un utilisateur depuis auth.users
-- Accessible aux agents authentifiés via SECURITY DEFINER (bypasse RLS sur auth.users)
CREATE OR REPLACE FUNCTION public.get_auth_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email FROM auth.users WHERE id = p_user_id
$$;
