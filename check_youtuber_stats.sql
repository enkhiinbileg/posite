
-- Check if youtuber_stats exists and what columns it has
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'youtuber_stats';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'youtuber_stats';
