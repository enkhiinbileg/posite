-- 🤖 AUTO-POSTER TRIGGER
-- Posts to 'general' chat whenever a Webtoon hits a 5-chapter milestone (5, 10, 15...)

CREATE OR REPLACE FUNCTION public.check_chapter_milestone()
RETURNS TRIGGER AS $$
DECLARE
    total_count INTEGER;
    webtoon_title TEXT;
    general_channel_id UUID;
    poster_id UUID;
BEGIN
    -- 1. Check if we have a valid translator to act as the "Poster"
    IF NEW.translator_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Count visible chapters for this webtoon
    SELECT COUNT(*) INTO total_count
    FROM public.chapters
    WHERE webtoon_id = NEW.webtoon_id
    AND published_at <= NOW();

    -- 3. Check Milestone (Divisible by 5)
    -- We use total_count because this trigger runs AFTER insert, so the new chapter is included.
    IF total_count > 0 AND (total_count % 5) = 0 THEN
        
        -- Get Webtoon Title
        SELECT title INTO webtoon_title
        FROM public.webtoons
        WHERE id = NEW.webtoon_id;

        -- Get 'general' channel ID
        SELECT id INTO general_channel_id
        FROM public.community_channels
        WHERE slug = 'general'
        LIMIT 1;

        -- If channel exists, Post Message!
        IF general_channel_id IS NOT NULL THEN
            INSERT INTO public.community_messages (channel_id, user_id, content)
            VALUES (
                general_channel_id,
                NEW.translator_id, -- Post AS the translator
                '🔥 **' || webtoon_title || '** цуврал ' || total_count || '-р бүлэгт хүрлээ! 5 бүлэг тутамд гарч буй автомат пост! 😎'
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Security Definer allows bypassing RLS to insert into messages

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trigger_auto_post_milestone ON public.chapters;

CREATE TRIGGER trigger_auto_post_milestone
    AFTER INSERT ON public.chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.check_chapter_milestone();
