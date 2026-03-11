-- Personnes recherchées — gérées par managers/admins, visibles par tous les agents
CREATE TABLE public.wanted_persons (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            text        NOT NULL,
  prenom         text        NOT NULL,
  date_naissance date,
  photo_url      text,
  notes          text,
  active         boolean     NOT NULL DEFAULT true,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wanted_persons ENABLE ROW LEVEL SECURITY;

-- Tous les agents authentifiés peuvent voir
CREATE POLICY "wanted_persons_select" ON public.wanted_persons
  FOR SELECT TO authenticated USING (true);

-- Managers et admins uniquement pour les modifications
CREATE POLICY "wanted_persons_insert" ON public.wanted_persons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_manager());

CREATE POLICY "wanted_persons_update" ON public.wanted_persons
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_manager())
  WITH CHECK (public.is_admin() OR public.is_manager());

CREATE POLICY "wanted_persons_delete" ON public.wanted_persons
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_manager());

-- Bucket de stockage pour les photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wanted-photos', 'wanted-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "wanted_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'wanted-photos');

CREATE POLICY "wanted_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wanted-photos' AND (public.is_admin() OR public.is_manager()));

CREATE POLICY "wanted_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'wanted-photos' AND (public.is_admin() OR public.is_manager()));
