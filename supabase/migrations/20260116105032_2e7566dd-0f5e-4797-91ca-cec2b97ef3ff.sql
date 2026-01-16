-- Create user_preferences table for syncing settings across devices
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  navigation_style TEXT NOT NULL DEFAULT 'bottom' CHECK (navigation_style IN ('bottom', 'burger')),
  visible_pages JSONB NOT NULL DEFAULT '["dashboard", "onboard", "station", "statistics", "history"]'::jsonb,
  notifications_push BOOLEAN NOT NULL DEFAULT true,
  notifications_email BOOLEAN NOT NULL DEFAULT false,
  notifications_fraud_alerts BOOLEAN NOT NULL DEFAULT true,
  notifications_new_controls BOOLEAN NOT NULL DEFAULT false,
  display_compact_mode BOOLEAN NOT NULL DEFAULT false,
  display_show_totals BOOLEAN NOT NULL DEFAULT true,
  default_page TEXT NOT NULL DEFAULT '/',
  data_auto_save BOOLEAN NOT NULL DEFAULT true,
  data_keep_history_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();