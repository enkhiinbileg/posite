-- RPC Function to get time-based leaderboard
-- This function calculates XP based on activity within a specific number of days.
-- interval_days: number of days to look back (7 for weekly, 30 for monthly)

CREATE OR REPLACE FUNCTION get_time_based_leaderboard(interval_days INT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    username TEXT,
    xp BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH activity AS (
        -- Reading XP (+10)
        SELECT user_id, count(*)::BIGINT * 10 as points
        FROM reading_progress
        WHERE last_read_at > NOW() - (interval_days || ' days')::interval
        GROUP BY user_id
        
        UNION ALL
        
        -- Like XP (+2)
        SELECT user_id, count(*)::BIGINT * 2 as points
        FROM likes
        WHERE created_at > NOW() - (interval_days || ' days')::interval
        GROUP BY user_id
        
        UNION ALL
        
        -- Comment XP (+5)
        SELECT user_id, count(*)::BIGINT * 5 as points
        FROM comments
        WHERE created_at > NOW() - (interval_days || ' days')::interval
        GROUP BY user_id
    ),
    summed_activity AS (
        SELECT activity.user_id, sum(points)::BIGINT as total_xp
        FROM activity
        GROUP BY activity.user_id
    )
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        p.username,
        s.total_xp as xp
    FROM summed_activity s
    JOIN profiles p ON s.user_id = p.id
    ORDER BY s.total_xp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
