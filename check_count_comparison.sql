
-- Check total counts vs user counts
SELECT 
    (SELECT count(*) FROM comments) as total_comments,
    (SELECT count(*) FROM comments WHERE user_id = auth.uid()) as my_comments,
    (SELECT count(*) FROM likes) as total_likes,
    (SELECT count(*) FROM likes WHERE user_id = auth.uid()) as my_likes;
