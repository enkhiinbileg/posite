ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vip_expiration TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
