-- 1. Function to award XP for Reading
CREATE OR REPLACE FUNCTION public.handle_reading_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 10 XP on first-time insert
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 10
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to award XP for Likes
CREATE OR REPLACE FUNCTION public.handle_like_xp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 2
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to award XP for Comments
CREATE OR REPLACE FUNCTION public.handle_comment_xp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 5
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Triggers
DROP TRIGGER IF EXISTS tr_reading_xp ON public.reading_progress;
CREATE TRIGGER tr_reading_xp
  AFTER INSERT ON public.reading_progress
  FOR EACH ROW EXECUTE PROCEDURE public.handle_reading_xp();

DROP TRIGGER IF EXISTS tr_like_xp ON public.likes;
CREATE TRIGGER tr_like_xp
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_like_xp();

DROP TRIGGER IF EXISTS tr_comment_xp ON public.comments;
CREATE TRIGGER tr_comment_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_xp();

-- 6. Recalculate and Fix Legacy Data (Cleanup)
-- This will reset everyone's XP to the correct value based on their actual activity.
UPDATE public.profiles
SET xp = (
    COALESCE((SELECT count(id) FROM public.reading_progress WHERE user_id = public.profiles.id), 0) * 10 +
    COALESCE((SELECT count(id) FROM public.likes WHERE user_id = public.profiles.id), 0) * 2 +
    COALESCE((SELECT count(id) FROM public.comments WHERE user_id = public.profiles.id), 0) * 5
);

-- Select to verify (optional)
SELECT id, full_name, xp FROM public.profiles ORDER BY xp DESC;
