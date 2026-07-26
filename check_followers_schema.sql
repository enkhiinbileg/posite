
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%favor%' OR table_name LIKE '%follow%' OR table_name LIKE '%subscri%';
