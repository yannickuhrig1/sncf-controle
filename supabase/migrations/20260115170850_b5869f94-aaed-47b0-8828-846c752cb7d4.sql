-- Update Yannick UHRIG to admin role
UPDATE public.profiles 
SET role = 'admin'::app_role 
WHERE user_id = '92c4e216-c813-46e0-b229-06bd5b450461';