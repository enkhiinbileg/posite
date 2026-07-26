
-- Check reading_progress columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reading_progress';

-- Check if we can join reading_progress -> chapters -> translator_id
SELECT 
    rp.last_read_at,
    c.translator_id,
    c.title
FROM reading_progress rp
JOIN chapters c ON rp.chapter_id = c.id
LIMIT 5;
