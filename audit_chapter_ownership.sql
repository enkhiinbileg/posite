
-- 📊 System-wide Chapter Ownership Audit
-- Run this in Supabase SQL Editor

-- 1. Detailed View: Who uploaded what?
SELECT 
    w.title AS "Webtoon",
    c.chapter_number AS "Chapter",
    c.title AS "Chapter Title",
    u.email AS "Translator Email", -- Shows Email if available
    c.translator_id AS "Translator ID",
    c.created_at AS "Uploaded At"
FROM chapters c
LEFT JOIN webtoons w ON c.webtoon_id = w.id
LEFT JOIN auth.users u ON c.translator_id = u.id
ORDER BY c.created_at DESC;

-- 2. Summary View: How many chapters per user?
SELECT 
    u.email AS "Translator",
    c.translator_id AS "User ID",
    COUNT(c.id) AS "Total Chapters"
FROM chapters c
LEFT JOIN auth.users u ON c.translator_id = u.id
GROUP BY u.email, c.translator_id
ORDER BY "Total Chapters" DESC;
