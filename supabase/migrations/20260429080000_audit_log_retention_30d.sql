-- Réduit la rétention de l'audit log de 90 à 30 jours.
CREATE OR REPLACE FUNCTION public.cleanup_audit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_log WHERE created_at < now() - INTERVAL '30 days';
END;
$$;
