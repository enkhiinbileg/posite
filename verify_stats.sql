-- 📊 VERIFICATION SCRIPT
-- Run this in your Supabase SQL Editor to see the Ground Truth

-- 1. Check Reading Progress Count (The "Total Views" Number)
-- This counts EVERY read record for your chapters since the start of the current month.
SELECT 
    COUNT(*) as "Total Reads (Verify)"
FROM reading_progress rp
JOIN chapters c ON rp.chapter_id = c.id
WHERE 
    c.translator_id = auth.uid() -- Uses your currently logged in ID
    AND rp.last_read_at >= DATE_TRUNC('month', NOW());

-- 2. Check VIP Reads Breakdown
SELECT 
    COUNT(*) as "VIP Reads (Real-time)"
FROM reading_progress rp
JOIN chapters c ON rp.chapter_id = c.id
WHERE 
    c.translator_id = auth.uid()
    AND rp.is_vip_read = TRUE
    AND rp.last_read_at >= DATE_TRUNC('month', NOW());

-- 3. Check Cached Monthly Stats (The "VIP" and "Earnings" Number on Dashboard)
SELECT 
    vip_reads as "Cached VIP Reads",
    total_earnings as "Cached Earnings"
FROM translator_monthly_stats
WHERE 
    translator_id = auth.uid()
    AND month_date = DATE_TRUNC('month', NOW());
