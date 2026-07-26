-- Add XP column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- Optional: Create a function to increment XP easily (atomic update)
-- formatting: increment_xp(user_id, amount)
CREATE OR REPLACE FUNCTION increment_xp(p_user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Allows function to run with owner privileges (bypasses RLS if needed for update)
AS $$
BEGIN
    UPDATE profiles
    SET xp = COALESCE(xp, 0) + amount
    WHERE id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_xp(UUID, INTEGER) TO service_role;
