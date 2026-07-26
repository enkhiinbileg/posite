
SELECT 
    count(*) as total_entries,
    count(*) filter (where is_finished = true) as finished_count,
    count(*) filter (where is_finished = false) as unfinished_count
FROM reading_progress
WHERE user_id = auth.uid();

-- Also let's specific entries to see what's wrong
SELECT * FROM reading_progress 
WHERE user_id = auth.uid() 
ORDER BY last_read_at DESC
LIMIT 10;
