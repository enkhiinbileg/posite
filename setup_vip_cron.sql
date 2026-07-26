-- Function to revoke expired VIPs
CREATE OR REPLACE FUNCTION handle_expired_vips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET is_vip = false, vip_expiration = NULL
  WHERE is_vip = true
    AND vip_expiration IS NOT NULL
    AND vip_expiration < NOW();
END;
$$;

-- Enable pg_cron if possible (requires superuser, often managed by dashboard in supabase)
-- users can run this in SQL editor which usually has permissions or they might need to use dashboard
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every 10 minutes
SELECT cron.schedule(
  'manage_vip_expiration',
  '*/10 * * * *', 
  $$SELECT handle_expired_vips()$$
);

NOTIFY pgrst, 'reload schema';
