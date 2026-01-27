-- Add history_view_mode column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS history_view_mode TEXT NOT NULL DEFAULT 'list' 
CHECK (history_view_mode IN ('list', 'table'));