
-- 🛡️ SUPABASE SECURITY HARDENING SCRIPT (v2 - Verified Signatures)

-- 1. EXTENSION PLACEMENT NOTE
-- pg_net specifically doesn't support 'SET SCHEMA'. 
-- We will leave it in public as moving it requires dropping it.

-- 2. FIX FUNCTION SEARCH PATHS
-- This prevents search path hijacking.

-- Trigger Functions (Return TRIGGER, usually no args in signature)
ALTER FUNCTION public.set_vip_grant_month() SET search_path = public;
ALTER FUNCTION public.set_uploaded_by() SET search_path = public;
ALTER FUNCTION public.notify_xp_reward() SET search_path = public;
ALTER FUNCTION public.notify_new_chapter() SET search_path = public;
ALTER FUNCTION public.notify_comment_like() SET search_path = public;
ALTER FUNCTION public.handle_like_xp() SET search_path = public;
ALTER FUNCTION public.on_reading_activity_strike() SET search_path = public;
ALTER FUNCTION public.on_profile_activity_strike() SET search_path = public;
ALTER FUNCTION public.handle_reading_xp() SET search_path = public;
ALTER FUNCTION public.handle_comment_xp() SET search_path = public;
ALTER FUNCTION public.update_translator_chapter_stats() SET search_path = public;
ALTER FUNCTION public.track_vip_read_for_royalty() SET search_path = public;
ALTER FUNCTION public.increment_chapter_views() SET search_path = public;
ALTER FUNCTION public.update_translator_vip_stats_monthly() SET search_path = public;
ALTER FUNCTION public.handle_user_sync() SET search_path = public;
ALTER FUNCTION public.set_unique_id_trigger() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- RPC and Internal Functions (Verified Signatures)
ALTER FUNCTION public.has_role(text[]) SET search_path = public;
ALTER FUNCTION public.broadcast_notification(text, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_moderator_rankings(timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.calculate_att_hours(uuid) SET search_path = public;
ALTER FUNCTION public.get_time_based_leaderboard(integer) SET search_path = public;
ALTER FUNCTION public.award_xp_base(uuid, text, integer, text) SET search_path = public;
ALTER FUNCTION public.get_monthly_vip_revenue(date) SET search_path = public;
ALTER FUNCTION public.handle_daily_strike(uuid) SET search_path = public;
ALTER FUNCTION public.ping_moderator() SET search_path = public;
ALTER FUNCTION public.check_in_strike() SET search_path = public;
ALTER FUNCTION public.distribute_monthly_royalties_auto(date) SET search_path = public;
ALTER FUNCTION public.distribute_monthly_royalties(date, numeric) SET search_path = public;
ALTER FUNCTION public.increment_xp(uuid, integer) SET search_path = public;
ALTER FUNCTION public.generate_unique_id() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.handle_expired_vips() SET search_path = public;

-- All 33 functions secured!
