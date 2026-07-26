-- Recalculate and Backfill XP for ALL users based on their history
-- This script will reset XP to match exactly what they have done:
-- 1. Finished Chapters: 10 XP each
-- 2. Comments: 5 XP each
-- 3. Likes: 2 XP each

UPDATE profiles p
SET xp = (
    -- Calculate Reading XP (10 per finished chapter)
    COALESCE((
        SELECT COUNT(*) * 10 
        FROM reading_progress rp 
        WHERE rp.user_id = p.id AND rp.is_finished = true
    ), 0) +
    
    -- Calculate Comment XP (5 per comment)
    COALESCE((
        SELECT COUNT(*) * 5
        FROM comments c 
        WHERE c.user_id = p.id
    ), 0) +

    -- Calculate Like XP (2 per like)
    COALESCE((
        SELECT COUNT(*) * 2
        FROM likes l 
        WHERE l.user_id = p.id
    ), 0)
);

-- Checks to verify the update (Optional, shows top 10 users after update)
SELECT username, xp, full_name FROM profiles ORDER BY xp DESC LIMIT 10;
