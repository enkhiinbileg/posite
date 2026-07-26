
-- Recalculate XP for all users based on their activity
UPDATE profiles
SET xp = (
    COALESCE((SELECT count(*) FROM reading_progress WHERE user_id = profiles.id), 0) * 10 +
    COALESCE((SELECT count(*) FROM likes WHERE user_id = profiles.id), 0) * 2 +
    COALESCE((SELECT count(*) FROM comments WHERE user_id = profiles.id), 0) * 5
);

-- Select to verify (optional)
SELECT id, username, xp FROM profiles ORDER BY xp DESC;
