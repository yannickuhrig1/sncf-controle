-- Fonction pour lire la dernière activité de tous les utilisateurs.
-- Retourne le MAX entre auth.users.last_sign_in_at et le dernier contrôle enregistré.
-- Cela évite que les utilisateurs avec un token persistant apparaissent "hors ligne"
-- alors qu'ils enregistrent des contrôles quotidiennement.
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
  RETURN QUERY
    SELECT
      u.id AS user_id,
      GREATEST(u.last_sign_in_at, c.last_control) AS last_sign_in_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN (
      SELECT agent_id, MAX(created_at) AS last_control
      FROM public.controls
      GROUP BY agent_id
    ) c ON c.agent_id = p.id;
END;
$$;
