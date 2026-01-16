-- Add new columns for dual navigation support
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS show_bottom_bar boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_burger_menu boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bottom_bar_pages jsonb DEFAULT '["dashboard", "onboard", "station", "statistics", "history"]'::jsonb;