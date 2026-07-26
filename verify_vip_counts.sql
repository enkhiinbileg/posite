-- Check Real-Time VIP Count vs Cached Monthly Stats
WITH real_counts AS (
    SELECT 
        c.translator_id,
        COUNT(*) as real_vip_count
    FROM reading_progress rp
    JOIN chapters c ON rp.chapter_id = c.id
    WHERE rp.is_vip_read = TRUE
    AND rp.last_read_at >= DATE_TRUNC('month', NOW())
    GROUP BY c.translator_id
),
cached_stats AS (
    SELECT 
        translator_id,
        vip_reads as cached_vip_count
    FROM translator_monthly_stats
    WHERE month_date = DATE_TRUNC('month', NOW())
)
SELECT 
    rc.translator_id,
    rc.real_vip_count,
    cs.cached_vip_count,
    (rc.real_vip_count - cs.cached_vip_count) as diff
FROM real_counts rc
LEFT JOIN cached_stats cs ON rc.translator_id = cs.translator_id;
