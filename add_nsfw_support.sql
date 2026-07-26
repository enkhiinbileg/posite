-- Add NSFW flag to webtoons
ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT FALSE;

-- Add NSFW VIP and visibility flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_nsfw BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nsfw_vip_expiration TIMESTAMPTZ DEFAULT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_webtoons_is_nsfw ON webtoons(is_nsfw);

-- Function to check if user has active NSFW VIP
CREATE OR REPLACE FUNCTION public.has_nsfw_vip(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid AND nsfw_vip_expiration > NOW()
  );
$$ LANGUAGE sql SECURITY DEFINER;
