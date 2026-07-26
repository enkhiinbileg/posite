
-- ⚠️ CAUTION: This will DELETE all activity for the user 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b'
-- Run this if you want to reset your profile stats to 0.

BEGIN;

-- 1. Delete Comments
DELETE FROM comments 
WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b';

-- 2. Delete Likes
DELETE FROM likes 
WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b';

-- 3. Delete Reading Progress
DELETE FROM reading_progress 
WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b';

COMMIT;

-- Verify it's all gone
SELECT 
    (SELECT count(*) FROM comments WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b') as comments_remaining,
    (SELECT count(*) FROM likes WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b') as likes_remaining,
    (SELECT count(*) FROM reading_progress WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b') as reading_history_remaining;
