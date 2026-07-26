
-- Run this in Supabase SQL Editor
-- This will link all currently "orphaned" chapters (missing translator_id) to YOUR account.

-- 1. Update chapters that have no translator_id
-- We use auth.uid() so it automatically links to YOU (the one running the query).
UPDATE chapters 
SET translator_id = auth.uid() 
WHERE translator_id IS NULL;

-- 2. Verify the update (Optional)
-- SELECT id, title, translator_id FROM chapters WHERE translator_id = auth.uid();
