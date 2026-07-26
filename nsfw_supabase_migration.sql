-- 1. Update Webtoons table with is_nsfw column
ALTER TABLE public.webtoons 
ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT FALSE;

-- 2. Update Profiles table with NSFW-related columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_nsfw BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nsfw_vip_expiration TIMESTAMPTZ DEFAULT NULL;

-- 3. Create Index for performance on NSFW queries
CREATE INDEX IF NOT EXISTS idx_webtoons_is_nsfw ON public.webtoons(is_nsfw);

-- 4. Create Helper Function to check NSFW VIP status
-- This will be used by the backend to verify adult content access
CREATE OR REPLACE FUNCTION public.has_nsfw_vip(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid AND nsfw_vip_expiration > NOW()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Grant permissions (just in case)
GRANT EXECUTE ON FUNCTION public.has_nsfw_vip(UUID) TO anon, authenticated, service_role;
