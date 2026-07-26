-- 1. XP Logs хүснэгт (Metadata нэмсэн)
CREATE TABLE IF NOT EXISTS public.xp_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, 
    xp_earned INTEGER NOT NULL,
    content_hash TEXT, -- Спам шалгахад ашиглах (MD5 эсвэл текст)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles хүснэгтэд Shadow Ban болон Failed Attempts багана нэмэх
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_xp_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shadow_banned_until TIMESTAMP WITH TIME ZONE;

-- 2. "Elite" XP олгох функц
CREATE OR REPLACE FUNCTION public.award_xp_base(p_user_id UUID, p_action TEXT, p_amount INTEGER, p_content TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_daily_xp INTEGER;
    v_last_action_time TIMESTAMP WITH TIME ZONE;
    v_cooldown_seconds INTEGER := 60;
    v_shadow_ban_until TIMESTAMP WITH TIME ZONE;
    v_failed_attempts INTEGER;
    v_content_hash TEXT;
BEGIN
    -- а. Shadow Ban шалгах (Нууц хориг)
    SELECT shadow_banned_until, failed_xp_attempts 
    INTO v_shadow_ban_until, v_failed_attempts
    FROM public.profiles WHERE id = p_user_id;

    IF v_shadow_ban_until IS NOT NULL AND v_shadow_ban_until > now() THEN
        RETURN FALSE; -- Shadow banned (XP олгохгүй, гэхдээ алдаа заахгүй)
    END IF;

    -- б. Өдрийн лимит (150 XP)
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_daily_xp
    FROM public.xp_logs
    WHERE user_id = p_user_id AND created_at >= date_trunc('day', now());

    IF v_daily_xp >= 150 THEN
        RETURN FALSE;
    END IF;

    -- в. Duplicate Check (Elite #1: Текст давхардал)
    IF p_content IS NOT NULL THEN
        v_content_hash := md5(lower(trim(p_content)));
        
        IF EXISTS (
            SELECT 1 FROM public.xp_logs 
            WHERE user_id = p_user_id 
            AND content_hash = v_content_hash
            AND created_at >= (now() - interval '24 hours')
        ) THEN
            -- Давхардсан текст илэрсэн -> Failed attempt гэж тооцно
            UPDATE public.profiles SET failed_xp_attempts = COALESCE(failed_xp_attempts, 0) + 1 WHERE id = p_user_id;
            RETURN FALSE;
        END IF;
    END IF;

    -- г. Cooldown шалгах
    v_cooldown_seconds := CASE 
        WHEN p_action = 'like' THEN 10 
        WHEN p_action = 'comment' THEN 60 
        ELSE 0 
    END;

    IF v_cooldown_seconds > 0 THEN
        SELECT created_at INTO v_last_action_time
        FROM public.xp_logs
        WHERE user_id = p_user_id AND action_type = p_action
        ORDER BY created_at DESC LIMIT 1;

        IF v_last_action_time IS NOT NULL AND now() < v_last_action_time + (v_cooldown_seconds || ' seconds')::INTERVAL THEN
            -- Cooldown зөрчсөн -> Shadow Ban логик (Elite #2)
            UPDATE public.profiles SET failed_xp_attempts = COALESCE(failed_xp_attempts, 0) + 1 WHERE id = p_user_id;
            
            -- Хэрэв 5 удаа зөрчвөл 24 цаг Shadow Ban
            IF v_failed_attempts >= 5 THEN
                UPDATE public.profiles 
                SET shadow_banned_until = now() + interval '24 hours',
                    failed_xp_attempts = 0
                WHERE id = p_user_id;
            END IF;
            
            RETURN FALSE;
        END IF;
    END IF;

    -- д. Амжилттай бол XP олгох
    INSERT INTO public.xp_logs (user_id, action_type, xp_earned, content_hash)
    VALUES (p_user_id, p_action, p_amount, v_content_hash);

    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + p_amount,
        failed_xp_attempts = GREATEST(0, COALESCE(failed_xp_attempts, 0) - 1) -- Зөв үйлдэлд counter-ыг багасгах
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger Функцуудыг шинэчлэх
CREATE OR REPLACE FUNCTION public.handle_reading_xp()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.is_finished = true AND (OLD.is_finished = false OR OLD.is_finished IS NULL)) THEN
        PERFORM public.award_xp_base(NEW.user_id, 'reading', 10);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_comment_xp()
RETURNS TRIGGER AS $$
BEGIN
    IF char_length(TRIM(NEW.content)) < 10 THEN
        RETURN NEW;
    END IF;
    -- Текстийг нь хамт дамжуулж Duplicate Check хийнэ
    PERFORM public.award_xp_base(NEW.user_id, 'comment', 5, NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_like_xp()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.award_xp_base(NEW.user_id, 'like', 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers-ийг шинэчлэх (Дахин холбох)
DROP TRIGGER IF EXISTS tr_reading_xp ON public.reading_progress;
CREATE TRIGGER tr_reading_xp
  AFTER UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE PROCEDURE public.handle_reading_xp();

DROP TRIGGER IF EXISTS tr_like_xp ON public.likes;
CREATE TRIGGER tr_like_xp
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_like_xp();

DROP TRIGGER IF EXISTS tr_comment_xp ON public.comments;
CREATE TRIGGER tr_comment_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_xp();
