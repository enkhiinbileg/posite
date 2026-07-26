
-- Run this to see what columns we have in 'chapters'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chapters';
