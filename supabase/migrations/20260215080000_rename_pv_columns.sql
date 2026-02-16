-- Rename PV columns to match the 5 correct business types:
-- STT100, RNV, Titre tiers, Date de naissance, Autre
--
-- Old mapping (incorrect/misleading names):
--   pv_absence_titre    → pv_stt100        (PV à 100€)
--   pv_titre_invalide   → pv_rnv           (RNV)
--   pv_refus_controle   → pv_titre_tiers   (Titre tiers)
--   pv_autre            → split into pv_doc_naissance + pv_autre

-- Rename existing columns
ALTER TABLE controls
  RENAME COLUMN pv_absence_titre TO pv_stt100;

ALTER TABLE controls
  RENAME COLUMN pv_absence_titre_amount TO pv_stt100_amount;

ALTER TABLE controls
  RENAME COLUMN pv_titre_invalide TO pv_rnv;

ALTER TABLE controls
  RENAME COLUMN pv_titre_invalide_amount TO pv_rnv_amount;

ALTER TABLE controls
  RENAME COLUMN pv_refus_controle TO pv_titre_tiers;

ALTER TABLE controls
  RENAME COLUMN pv_refus_controle_amount TO pv_titre_tiers_amount;

-- pv_autre was previously used to aggregate both D. naissance and Autre
-- We keep pv_autre for "Autre" and add a new pv_doc_naissance column
-- Existing data in pv_autre stays as-is (treated as "Autre")
ALTER TABLE controls
  ADD COLUMN IF NOT EXISTS pv_doc_naissance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pv_doc_naissance_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN controls.pv_stt100 IS 'PV STT 100€ - Procès-verbal à 100€';
COMMENT ON COLUMN controls.pv_rnv IS 'PV RNV - Refus de validation';
COMMENT ON COLUMN controls.pv_titre_tiers IS 'PV Titre tiers';
COMMENT ON COLUMN controls.pv_doc_naissance IS 'PV Document de naissance';
COMMENT ON COLUMN controls.pv_autre IS 'PV Autre motif';
