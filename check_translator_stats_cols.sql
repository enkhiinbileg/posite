
-- Check current columns in translator_stats
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'translator_stats';
