
-- Audit trail table for tracking all control modifications
CREATE TABLE public.control_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changes jsonb DEFAULT '{}'::jsonb,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_control_id ON public.control_audit_log(control_id);
CREATE INDEX idx_audit_created_at ON public.control_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.control_audit_log ENABLE ROW LEVEL SECURITY;

-- Only managers/admins can read audit logs
CREATE POLICY "audit_log_select" ON public.control_audit_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_admin() OR is_manager()));

-- System inserts via trigger (service role), but also allow authenticated inserts
CREATE POLICY "audit_log_insert" ON public.control_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No one can update or delete audit logs
CREATE POLICY "audit_log_no_update" ON public.control_audit_log
  FOR UPDATE USING (false);

CREATE POLICY "audit_log_no_delete" ON public.control_audit_log
  FOR DELETE USING (false);

-- Trigger function to auto-log changes
CREATE OR REPLACE FUNCTION public.log_control_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  col text;
  old_val text;
  new_val text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.control_audit_log (control_id, user_id, action, new_values)
    VALUES (NEW.id, auth.uid(), 'insert', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Build changes object with only modified fields
    FOR col IN SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'controls' 
      AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::text', col) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::text', col) INTO new_val USING NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        changed_fields := changed_fields || jsonb_build_object(col, jsonb_build_object('old', old_val, 'new', new_val));
      END IF;
    END LOOP;
    
    IF changed_fields != '{}'::jsonb THEN
      INSERT INTO public.control_audit_log (control_id, user_id, action, changes, old_values, new_values)
      VALUES (NEW.id, auth.uid(), 'update', changed_fields, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.control_audit_log (control_id, user_id, action, old_values)
    VALUES (OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach trigger to controls table
CREATE TRIGGER controls_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.controls
  FOR EACH ROW EXECUTE FUNCTION public.log_control_changes();
