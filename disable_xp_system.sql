-- ⏹️ DISABLE XP SYSTEM TRIGGERS (EMERGENCY LOAD REDUCTION)
DROP TRIGGER IF EXISTS tr_reading_xp ON public.reading_progress;
DROP TRIGGER IF EXISTS tr_like_xp ON public.likes;
DROP TRIGGER IF EXISTS tr_comment_xp ON public.comments;

-- 🧹 CLEANUP AMBIGUOUS FUNCTIONS
-- This drops the older signatures that are causing "function not unique" errors
DROP FUNCTION IF EXISTS public.award_xp_base(uuid, text, integer);
DROP FUNCTION IF EXISTS public.award_xp_base(uuid, unknown, integer);

-- 🛡️ SECURE REMAINING FUNCTION (4-argument version)
ALTER FUNCTION public.award_xp_base(uuid, text, integer, text) SET search_path = public;

-- 📝 NOTE: To re-enable XP system later, run xp_anti_spam.sql
