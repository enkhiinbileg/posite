
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name LIKE '%subscription%' OR table_name LIKE '%payment%';
