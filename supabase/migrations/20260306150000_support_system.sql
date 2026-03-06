-- Table pour les tickets d'assistance (bugs + messages vers l'admin)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type             text        NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'message')),
  subject          text        NOT NULL,
  message          text        NOT NULL,
  status           text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  attachment_paths text[]      NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Agents : peuvent créer leurs tickets
CREATE POLICY "support_tickets_insert" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agents voient leurs propres tickets ; admins voient tout
CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Seul l'admin peut modifier le statut
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Bucket Supabase Storage pour les pièces jointes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760, -- 10 Mo
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- RLS Storage : chaque user upload dans son dossier user_id/
CREATE POLICY "support_attach_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Lecture : propriétaire ou admin
CREATE POLICY "support_attach_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

-- Setting : coordonnées du support application
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'support_contact',
  '{"email": "controle-app@sncf.fr", "phone": ""}'::jsonb,
  'Coordonnées du support application (email + téléphone)'
) ON CONFLICT (key) DO NOTHING;
