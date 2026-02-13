
-- Add is_approved column to profiles (existing users are approved by default)
ALTER TABLE public.profiles ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Approve all existing users
UPDATE public.profiles SET is_approved = true;

-- For new users created via handle_new_user trigger, default is false (pending approval)
-- Admin-created users (via create-user edge function) will set is_approved = true directly
