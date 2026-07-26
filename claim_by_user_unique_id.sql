
-- Run this in Supabase SQL Editor
-- Claim chapters using USER UNIQUE ID (The # number on profile)

DO $$
DECLARE
    -- 👇 1. Enter the Translator's Unique ID (Example: '30578580')
    target_unique_id TEXT := '30578580'; 
    
    -- 👇 2. Enter the Webtoon ID they worked on (To be safe)
    -- You can find this in the URL of the webtoon page or via the audit script
    -- If you want to claim ALL their chapters across ALL webtoons, comment out the "AND webtoon_id = ..." line below.
    target_webtoon_id BIGINT := 0; -- Replace 0 with the actual Webtoon ID (e.g., 123)
    
    found_user_id UUID;
    updated_count INTEGER;
BEGIN
    -- 1. Find User by Unique ID
    SELECT id INTO found_user_id FROM profiles WHERE unique_id = target_unique_id;
    
    IF found_user_id IS NULL THEN
        RAISE EXCEPTION '❌ User with Unique ID #% not found!', target_unique_id;
    ELSE
        RAISE NOTICE '✅ Found User UUID: %', found_user_id;

        -- 2. Update Chapters
        -- ONLY updates chapters that currently have NO translator (translator_id IS NULL)
        -- AND belong to the specified Webtoon ID.
        WITH rows AS (
            UPDATE chapters 
            SET translator_id = found_user_id
            WHERE translator_id IS NULL 
            AND webtoon_id = target_webtoon_id  -- <--- Comment this out if you want to claim EVERYTHING
            RETURNING 1
        )
        SELECT count(*) INTO updated_count FROM rows;

        RAISE NOTICE '✅ SUCCESS: Claimed % chapters for Webtoon ID % to User #%', updated_count, target_webtoon_id, target_unique_id;

        -- 3. Recalculate Stats
        INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
        VALUES (found_user_id, (SELECT COUNT(*) FROM chapters WHERE translator_id = found_user_id), NOW())
        ON CONFLICT (translator_id)
        DO UPDATE SET 
            total_chapters_translated = (SELECT COUNT(*) FROM chapters WHERE translator_id = found_user_id),
            updated_at = NOW();

        RAISE NOTICE '📊 Stats updated.';
    END IF;
END $$;
