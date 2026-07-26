
-- 1. Add total_followers to translator_stats
ALTER TABLE translator_stats 
ADD COLUMN IF NOT EXISTS total_followers INTEGER DEFAULT 0;

-- 2. Backfill Followers Count
-- Logic: Count follows for any webtoon where the translator has uploaded at least one chapter.
DO $$
BEGIN
    UPDATE translator_stats ts
    SET total_followers = (
        SELECT COUNT(DISTINCT f.user_id)
        FROM follows f
        WHERE f.webtoon_id IN (
            SELECT DISTINCT c.webtoon_id 
            FROM chapters c 
            WHERE c.translator_id = ts.translator_id
        )
    );
END $$;


DO $$
BEGIN
    RAISE NOTICE '✅ Real Follower Counts have been calculated and stored!';
END $$;
