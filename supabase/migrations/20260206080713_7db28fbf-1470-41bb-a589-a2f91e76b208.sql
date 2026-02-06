-- Update existing user preferences to include 'infos' in visible_pages if not already present
UPDATE user_preferences
SET visible_pages = visible_pages || '["infos"]'::jsonb
WHERE NOT (visible_pages ? 'infos');

-- Also update the default value for visible_pages to include 'infos'
ALTER TABLE user_preferences 
ALTER COLUMN visible_pages 
SET DEFAULT '["dashboard", "onboard", "station", "statistics", "history", "infos"]'::jsonb;