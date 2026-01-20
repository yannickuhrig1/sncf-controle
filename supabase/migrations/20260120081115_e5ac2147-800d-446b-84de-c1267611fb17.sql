-- Add UI theme variant + onboard fraud chart toggle
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS theme_variant text NOT NULL DEFAULT 'sncf',
  ADD COLUMN IF NOT EXISTS show_onboard_fraud_chart boolean NOT NULL DEFAULT true;

-- Preserve legacy mapping (Settings previously stored "Coloré" into navigation_style='burger')
UPDATE public.user_preferences
SET theme_variant = 'colore'
WHERE navigation_style = 'burger' AND theme_variant = 'sncf';

-- Constrain possible values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_theme_variant_check'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_theme_variant_check
      CHECK (theme_variant IN ('sncf','colore'));
  END IF;
END $$;