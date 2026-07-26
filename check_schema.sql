
-- Check columns in comments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments';

-- Check columns in likes table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'likes';

-- Check a few rows to see user_id format
SELECT user_id FROM comments LIMIT 3;
