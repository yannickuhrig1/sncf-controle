-- Add pdf_orientation column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN pdf_orientation text NOT NULL DEFAULT 'auto';

-- Add comment
COMMENT ON COLUMN public.user_preferences.pdf_orientation IS 'PDF export orientation preference: portrait, landscape, or auto';