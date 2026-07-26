
-- Verify Total Translator Fund
-- This query sums up all earnings from all translators to check if the Admin Dashboard matches.

SELECT 
    COUNT(*) as total_translators,
    SUM(total_earnings) as total_generated_revenue,
    SUM(current_balance) as total_pending_payouts
FROM translator_stats;

-- Check individual top earners to verify calculation
SELECT 
    translator_id, 
    total_earnings, 
    current_balance 
FROM translator_stats 
ORDER BY total_earnings DESC 
LIMIT 5;
