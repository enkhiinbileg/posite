-- Backfill Profiles from Auth Users
-- This is needed if users were created before the handle_new_user trigger was working or if it failed.
INSERT INTO public.profiles (id, username, full_name, avatar_url)
SELECT 
  id, 
  LOWER(SPLIT_PART(email, '@', 1)), -- Generate username from email
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verification: Check count
SELECT count(*) as "Auth Users" FROM auth.users;
SELECT count(*) as "Profiles" FROM public.profiles;
