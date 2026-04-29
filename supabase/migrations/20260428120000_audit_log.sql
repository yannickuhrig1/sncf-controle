-- Table d'audit applicatif : trace les évènements utilisateur (CRUD,
-- changements de rôle, login/logout). Lecture admin uniquement, écriture
-- via triggers SECURITY DEFINER + une RPC pour les évènements d'auth.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  meta        jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Aucune INSERT policy : les triggers tournent SECURITY DEFINER, donc ils
-- peuvent écrire en bypassant RLS. Les utilisateurs ne peuvent pas
-- insérer directement.

-- Trigger : controls (INSERT / UPDATE / DELETE)
CREATE OR REPLACE FUNCTION public.log_control_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id    uuid;
  action_type text;
  rec         record;
  meta_data   jsonb;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    action_type := 'create'; rec := NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    action_type := 'update'; rec := NEW;
  ELSE
    action_type := 'delete'; rec := OLD;
  END IF;

  actor_id := auth.uid();
  IF actor_id IS NULL THEN
    SELECT user_id INTO actor_id FROM public.profiles WHERE id = rec.agent_id;
  END IF;

  meta_data := jsonb_build_object(
    'location_type', rec.location_type,
    'location',      rec.location,
    'train_number',  rec.train_number,
    'origin',        rec.origin,
    'destination',   rec.destination,
    'control_date',  rec.control_date
  );

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, meta)
  VALUES (actor_id, action_type, 'control', rec.id, meta_data);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_controls ON public.controls;
CREATE TRIGGER audit_controls
AFTER INSERT OR UPDATE OR DELETE ON public.controls
FOR EACH ROW EXECUTE FUNCTION public.log_control_event();

-- Trigger : embarkment_missions (INSERT / UPDATE / DELETE)
CREATE OR REPLACE FUNCTION public.log_embarkment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id    uuid;
  action_type text;
  rec         record;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    action_type := 'create'; rec := NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    action_type := 'update'; rec := NEW;
  ELSE
    action_type := 'delete'; rec := OLD;
  END IF;

  actor_id := auth.uid();
  IF actor_id IS NULL THEN
    SELECT user_id INTO actor_id FROM public.profiles WHERE id = rec.agent_id;
  END IF;

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, meta)
  VALUES (actor_id, action_type, 'embarkment_mission', rec.id, jsonb_build_object(
    'station_name', rec.station_name,
    'mission_date', rec.mission_date,
    'is_completed', rec.is_completed
  ));

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_embarkment_missions ON public.embarkment_missions;
CREATE TRIGGER audit_embarkment_missions
AFTER INSERT OR UPDATE OR DELETE ON public.embarkment_missions
FOR EACH ROW EXECUTE FUNCTION public.log_embarkment_event();

-- Trigger : profile role / team changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR (NEW.is_approved IS DISTINCT FROM OLD.is_approved) THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, meta)
    VALUES (
      auth.uid(),
      CASE
        WHEN NEW.role IS DISTINCT FROM OLD.role THEN 'role_change'
        WHEN NEW.is_approved IS DISTINCT FROM OLD.is_approved AND NEW.is_approved THEN 'approve'
        ELSE 'team_change'
      END,
      'profile',
      NEW.id,
      jsonb_build_object(
        'old_role',     OLD.role,
        'new_role',     NEW.role,
        'old_team_id',  OLD.team_id,
        'new_team_id',  NEW.team_id,
        'is_approved',  NEW.is_approved,
        'profile_name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')
      )
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_changes ON public.profiles;
CREATE TRIGGER audit_profile_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

-- RPC publique pour logger les évènements d'auth (login / logout)
CREATE OR REPLACE FUNCTION public.log_auth_event(p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF p_action NOT IN ('login', 'logout') THEN RETURN; END IF;
  INSERT INTO public.audit_log (user_id, action, entity_type, meta)
  VALUES (auth.uid(), p_action, 'auth', '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_auth_event(text) TO authenticated;

-- Nettoyage automatique : conserver 90 jours d'audit
-- (à exécuter via un cron Supabase ou manuellement)
CREATE OR REPLACE FUNCTION public.cleanup_audit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_log WHERE created_at < now() - INTERVAL '90 days';
END;
$$;
