-- Create admin_settings table for global configuration
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "admin_settings_read" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_settings_write" ON public.admin_settings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert default fraud rate thresholds
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'fraud_rate_thresholds',
  '{"low": 5, "medium": 10}'::jsonb,
  'Seuils de couleur pour le taux de fraude: vert < low, jaune >= low et < medium, rouge >= medium'
);

-- Trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();