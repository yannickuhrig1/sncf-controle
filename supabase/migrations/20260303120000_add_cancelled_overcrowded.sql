-- Add is_cancelled and is_overcrowded flags to controls table
ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS is_cancelled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_overcrowded BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN controls.is_cancelled   IS 'Train supprimé lors du contrôle';
COMMENT ON COLUMN controls.is_overcrowded IS 'Sur-occupation constatée lors du contrôle';
