
-- Run this in Supabase SQL Editor
-- Claim chapters by WEBTOON ID (More accurate than title)

DO $$
DECLARE
    -- 👇 1. Enter your Email
    my_email TEXT := 'YOUR_EMAIL@GMAIL.COM'; 
    
    -- 👇 2. Enter the Webtoon ID (From the badge, e.g., 30578580)
    target_webtoon_id BIGINT := 30578580; 
    
    user_id UUID;
    updated_count INTEGER;
BEGIN
    -- Find User
    SELECT id INTO user_id FROM auth.users WHERE email = my_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION '❌ User with email % not found!', my_email;
    END IF;

    -- Update Chapters
    WITH rows AS (
        UPDATE chapters 
        SET translator_id = user_id
        WHERE webtoon_id = target_webtoon_id
        RETURNING 1
    )
    SELECT count(*) INTO updated_count FROM rows;

    RAISE NOTICE '✅ SUCCESS: Claimed % chapters for Webtoon ID %', updated_count, target_webtoon_id;

    -- Recalculate Stats for this user
    INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
    VALUES (user_id, (SELECT COUNT(*) FROM chapters WHERE translator_id = user_id), NOW())
    ON CONFLICT (translator_id)
    DO UPDATE SET 
        total_chapters_translated = (SELECT COUNT(*) FROM chapters WHERE translator_id = user_id),
        updated_at = NOW();

    RAISE NOTICE '📊 Stats updated.';

END $$;
