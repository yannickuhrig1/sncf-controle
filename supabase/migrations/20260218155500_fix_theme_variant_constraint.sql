-- Fix theme_variant check constraint to include all 4 theme values used by the frontend
-- The frontend sends: 'sncf', 'colore', 'pro', 'moderne'
-- The old constraint only allowed: 'sncf', 'colore'

-- Drop the existing constraint
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_variant_check;

-- Recreate the constraint with all valid theme values
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_variant_check
  CHECK (theme_variant IN ('sncf', 'colore', 'pro', 'moderne'));

-- Also fix the dark mode: ensure the theme column accepts all valid values
-- The frontend sends theme: 'light', 'dark', 'system'
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_preferences'
        AND column_name = 'theme'
    ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_theme_check
      CHECK (theme IN ('light', 'dark', 'system'));
  END IF;
END $$;
