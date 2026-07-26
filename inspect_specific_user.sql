
-- Corrected query without webtoon_id
SELECT id, content, created_at, chapter_id 
FROM comments 
WHERE user_id = 'b3d2cf2e-789c-4afc-9eb2-bb3e383e700b'
ORDER BY created_at DESC;

SELECT count(*) as total_global_comments FROM comments;
