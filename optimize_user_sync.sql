-- Optimizing handle_user_sync to avoid double trigger
CREATE OR REPLACE FUNCTION public.handle_user_sync() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    -- Only update meta fields if they are null in profiles or changed
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    last_seen = now();

  -- REMOVED: PERFORM public.handle_daily_strike(new.id);
  -- REASON: The update to 'last_seen' above already triggers 'tr_profile_strike',
  -- which calls 'handle_daily_strike'. Calling it here makes it run TWICE.

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
