
-- Run this in Supabase SQL Editor
-- Use this to claim chapters for a SPECIFIC WEBTOON only.

DO $$
DECLARE
    -- 👇 1. Enter your Email
    my_email TEXT := 'YOUR_EMAIL@GMAIL.COM'; 
    
    -- 👇 2. Enter the Webtoon Title (Exact name)
    target_webtoon_title TEXT := 'WEBTOON_NAME_HERE'; 
    
    user_id UUID;
    v_webtoon_id BIGINT;
    updated_count INTEGER;
BEGIN
    -- Find User
    SELECT id INTO user_id FROM auth.users WHERE email = my_email;
    
    -- Find Webtoon
    SELECT id INTO v_webtoon_id FROM webtoons WHERE title ILIKE target_webtoon_title LIMIT 1;

    IF user_id IS NULL THEN
        RAISE EXCEPTION '❌ User with email % not found!', my_email;
    END IF;

    IF v_webtoon_id IS NULL THEN
        RAISE EXCEPTION '❌ Webtoon "%" not found!', target_webtoon_title;
    END IF;

    -- Update Chapters
    WITH rows AS (
        UPDATE chapters 
        SET translator_id = user_id
        WHERE webtoon_id = v_webtoon_id
        RETURNING 1
    )
    SELECT count(*) INTO updated_count FROM rows;

    RAISE NOTICE '✅ SUCCESS: Claimed % chapters for webtoon "%" (ID: %)', updated_count, target_webtoon_title, v_webtoon_id;

    -- Recalculate Stats for this user
    INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
    VALUES (user_id, (SELECT COUNT(*) FROM chapters WHERE translator_id = user_id), NOW())
    ON CONFLICT (translator_id)
    DO UPDATE SET 
        total_chapters_translated = (SELECT COUNT(*) FROM chapters WHERE translator_id = user_id),
        updated_at = NOW();

    RAISE NOTICE '📊 Stats updated.';

END $$;
