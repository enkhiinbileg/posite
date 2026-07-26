-- Add is_vip column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;

-- Notify pgrst to reload schema cache
NOTIFY pgrst, 'reload schema';
