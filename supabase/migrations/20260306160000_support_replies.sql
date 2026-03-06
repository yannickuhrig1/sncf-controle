-- Table pour les réponses aux tickets d'assistance
CREATE TABLE public.support_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid        REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id  uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message    text        NOT NULL,
  is_admin   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

-- SELECT : propriétaire du ticket OU admin
CREATE POLICY "support_replies_select" ON public.support_replies
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- INSERT admin (is_admin=true)
CREATE POLICY "support_replies_insert_admin" ON public.support_replies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND is_admin = true);

-- INSERT agent (is_admin=false, seulement sur ses propres tickets)
CREATE POLICY "support_replies_insert_user" ON public.support_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin = false
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- Colonne has_unread_reply sur support_tickets (badge notification côté agent)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS has_unread_reply boolean NOT NULL DEFAULT false;

-- RPC pour que l'agent marque son ticket comme lu (SECURITY DEFINER car la RLS update est admin-only)
CREATE OR REPLACE FUNCTION public.mark_ticket_read(p_ticket_id uuid)
RETURNS void
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.support_tickets
  SET has_unread_reply = false
  WHERE id = p_ticket_id AND user_id = auth.uid();
$$;
