-- 1. Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Allow everyone to read profiles (needed for Sidebar/Navbar to check roles safely)
-- NOTE: If you want to restrict this, use: auth.uid() = id OR is_admin=true OR is_moderator=true
-- But for UI checks, reading own profile is key.
CREATE POLICY "Public profiles" ON public.profiles
    FOR SELECT USING (true);

-- Allow users to update ONLY their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert ONLY their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';

-- 6. (Optional) Check count of moderators to verify
-- SELECT count(*) FROM profiles WHERE is_moderator = true;
