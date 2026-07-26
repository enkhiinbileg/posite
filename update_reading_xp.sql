-- Update Reading XP Trigger to split 5 XP for opening and 5 XP for finishing
CREATE OR REPLACE FUNCTION public.handle_reading_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Award 5 XP for first-time opening
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles
        SET xp = COALESCE(xp, 0) + 5
        WHERE id = NEW.user_id;

    -- 2. Award another 5 XP for finishing (only once)
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.is_finished = true AND (OLD.is_finished = false OR OLD.is_finished IS NULL)) THEN
            UPDATE public.profiles
            SET xp = COALESCE(xp, 0) + 5
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS tr_reading_xp ON public.reading_progress;
CREATE TRIGGER tr_reading_xp
  AFTER INSERT OR UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE PROCEDURE public.handle_reading_xp();

-- Sync current data as if they finished what they already finished
UPDATE public.profiles
SET xp = (
    -- Opening points: 5 XP per record
    COALESCE((SELECT count(id) FROM public.reading_progress WHERE user_id = public.profiles.id), 0) * 5 +
    -- Finishing points: 5 XP per finished record
    COALESCE((SELECT count(id) FROM public.reading_progress WHERE user_id = public.profiles.id AND is_finished = true), 0) * 5 +
    -- Likes: 2 XP
    COALESCE((SELECT count(id) FROM public.likes WHERE user_id = public.profiles.id), 0) * 2 +
    -- Comments: 5 XP
    COALESCE((SELECT count(id) FROM public.comments WHERE user_id = public.profiles.id), 0) * 5
);
