-- Create table for embarkment missions
CREATE TABLE public.embarkment_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  station_name TEXT NOT NULL,
  global_comment TEXT,
  trains JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.embarkment_missions ENABLE ROW LEVEL SECURITY;

-- Require auth for all operations
CREATE POLICY "embarkment_missions_require_auth"
ON public.embarkment_missions
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Agents can view their own missions, managers can view team missions, admins can view all
CREATE POLICY "embarkment_missions_select"
ON public.embarkment_missions
AS RESTRICTIVE
FOR SELECT
USING (
  is_admin() 
  OR (agent_id = get_current_profile_id()) 
  OR (is_manager() AND team_id = get_user_team_id())
);

-- Agents can insert their own missions
CREATE POLICY "embarkment_missions_insert"
ON public.embarkment_missions
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  is_admin() 
  OR (
    agent_id = get_current_profile_id() 
    AND (team_id IS NULL OR team_id = get_user_team_id())
  )
);

-- Agents can update their own missions, admins can update any
CREATE POLICY "embarkment_missions_update"
ON public.embarkment_missions
AS RESTRICTIVE
FOR UPDATE
USING (agent_id = get_current_profile_id() OR is_admin())
WITH CHECK (
  is_admin() 
  OR (
    agent_id = get_current_profile_id() 
    AND (team_id IS NULL OR team_id = get_user_team_id())
  )
);

-- Agents can delete their own missions, admins can delete any
CREATE POLICY "embarkment_missions_delete"
ON public.embarkment_missions
AS RESTRICTIVE
FOR DELETE
USING (agent_id = get_current_profile_id() OR is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_embarkment_missions_updated_at
BEFORE UPDATE ON public.embarkment_missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_embarkment_missions_agent_date ON public.embarkment_missions(agent_id, mission_date DESC);