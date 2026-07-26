-- STEP 2: INITIAL SYNC FOR EXISTING DATA
-- This updates the count for all existing webtoons. 
-- Run this AFTER Step 1 is successful.

UPDATE webtoons w
SET chapter_count_label = sub.cnt || ' Бүлэг'
FROM (
    SELECT webtoon_id, count(*) as cnt
    FROM chapters
    GROUP BY webtoon_id
) sub
WHERE w.id = sub.webtoon_id;

-- [SUCCESS] Step 2 complete. All existing webtoons are now synced.
