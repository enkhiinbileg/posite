-- Check Monthly Stats for the current user (Mongolian Art / User ID likely from context or I can query by email)
-- Let's check ALL monthly stats to be sure
SELECT 
    tms.id,
    tms.translator_id,
    tms.month_date,
    tms.vip_reads,
    tms.total_earnings,
    p.email
FROM translator_monthly_stats tms
JOIN profiles p ON tms.translator_id = p.id
ORDER BY tms.month_date DESC;

-- Only checking top 10 recent
