-- Ajout du retard à la gare de destination (en minutes) sur les contrôles
ALTER TABLE public.controls ADD COLUMN IF NOT EXISTS train_delay_minutes INTEGER DEFAULT NULL;
