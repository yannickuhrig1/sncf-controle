ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS is_police_on_board BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suge_on_board   BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN controls.is_police_on_board IS 'Police à bord lors du contrôle';
COMMENT ON COLUMN controls.is_suge_on_board   IS 'SUGE à bord lors du contrôle';
