-- Add co_manager_ids array to teams (multiple managers per team)
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS co_manager_ids UUID[] DEFAULT '{}';

-- Team join requests table
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, requester_id)
);

ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- Managers can create requests
CREATE POLICY "managers_can_insert_join_requests" ON public.team_join_requests
  FOR INSERT WITH CHECK (
    requester_id = get_current_profile_id()
    AND get_user_role() IN ('manager', 'admin')
  );

-- Can read own requests + requests for teams you manage
CREATE POLICY "can_read_join_requests" ON public.team_join_requests
  FOR SELECT USING (
    requester_id = get_current_profile_id()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND (t.manager_id = get_current_profile_id() OR t.co_manager_ids @> ARRAY[get_current_profile_id()])
    )
  );

-- Team manager/admin can update (approve/reject)
CREATE POLICY "can_update_join_requests" ON public.team_join_requests
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND (t.manager_id = get_current_profile_id() OR t.co_manager_ids @> ARRAY[get_current_profile_id()])
    )
  );
