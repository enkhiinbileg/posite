-- 🏊‍♂️ VIP GRANT TRACKING SYSTEM
-- This table logs every VIP grant to calculate monthly revenue automatically

-- 1. Create VIP Grants Log Table
CREATE TABLE IF NOT EXISTS vip_grants (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    granted_by UUID REFERENCES profiles(id), -- Admin who granted
    package_type VARCHAR(50) NOT NULL, -- 'bronze', 'silver', 'diamond'
    price NUMERIC NOT NULL, -- Price of the package at time of grant
    duration_days INTEGER NOT NULL, -- How many days VIP was granted
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    month_date DATE DEFAULT DATE_TRUNC('month', NOW())::DATE -- Defaults to current month start
);

-- Trigger to ensure month_date is always synced with granted_at
CREATE OR REPLACE FUNCTION set_vip_grant_month()
RETURNS TRIGGER AS $$
BEGIN
    NEW.month_date := DATE_TRUNC('month', NEW.granted_at)::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_vip_grant_month
BEFORE INSERT OR UPDATE ON vip_grants
FOR EACH ROW EXECUTE FUNCTION set_vip_grant_month();

-- 2. Create Index for fast monthly queries
CREATE INDEX IF NOT EXISTS idx_vip_grants_month ON vip_grants(month_date);

-- 3. Enable RLS
ALTER TABLE vip_grants ENABLE ROW LEVEL SECURITY;

-- 4. Admin only policy
CREATE POLICY "Admin can manage vip_grants" ON vip_grants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 5. Create Function to Calculate Monthly Revenue
CREATE OR REPLACE FUNCTION get_monthly_vip_revenue(target_month DATE DEFAULT DATE_TRUNC('month', NOW()))
RETURNS TABLE (
    total_grants INTEGER,
    total_revenue NUMERIC,
    avg_price NUMERIC,
    bronze_count INTEGER,
    silver_count INTEGER,
    diamond_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_grants,
        COALESCE(SUM(price), 0) as total_revenue,
        COALESCE(AVG(price), 0) as avg_price,
        COUNT(*) FILTER (WHERE package_type = 'bronze')::INTEGER as bronze_count,
        COUNT(*) FILTER (WHERE package_type = 'silver')::INTEGER as silver_count,
        COUNT(*) FILTER (WHERE package_type = 'diamond')::INTEGER as diamond_count
    FROM vip_grants
    WHERE month_date = target_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Updated Distribution Function (Automatically uses VIP revenue)
CREATE OR REPLACE FUNCTION distribute_monthly_royalties_auto(target_month DATE DEFAULT DATE_TRUNC('month', NOW()))
RETURNS TABLE (
    pool_size NUMERIC,
    total_vip_reads INTEGER,
    rate_per_read NUMERIC,
    translators_paid INTEGER
) AS $$
DECLARE
    v_total_revenue NUMERIC;
    v_pool_size NUMERIC;
    v_total_reads INTEGER;
    v_calculated_rate NUMERIC;
    v_translators_paid INTEGER;
    v_already_distributed BOOLEAN;
BEGIN
    -- Check if already distributed this month
    SELECT is_distributed INTO v_already_distributed 
    FROM finance_monthly_pools 
    WHERE month_date = target_month;
    
    IF v_already_distributed = TRUE THEN
        RAISE EXCEPTION 'This month has already been distributed. Use manual override if needed.';
    END IF;

    -- A. Get Total Revenue from VIP Grants
    SELECT COALESCE(SUM(price), 0) INTO v_total_revenue
    FROM vip_grants
    WHERE vip_grants.month_date = target_month;

    IF v_total_revenue = 0 THEN
        RAISE EXCEPTION 'No VIP grants found for this month. Cannot distribute.';
    END IF;

    -- B. Calculate Pool Size (30% of Revenue)
    v_pool_size := v_total_revenue * 0.30;
    
    -- C. Get Total VIP Reads for that month from all translators
    SELECT COALESCE(SUM(vip_reads), 0) INTO v_total_reads
    FROM translator_monthly_stats
    WHERE translator_monthly_stats.month_date = target_month;

    IF v_total_reads = 0 THEN
        RAISE EXCEPTION 'No VIP reads found for this month. Cannot distribute.';
    END IF;

    -- D. Calculate Rate per Read
    v_calculated_rate := v_pool_size / v_total_reads;

    -- E. Record the Pool Info
    INSERT INTO finance_monthly_pools (month_date, total_revenue, translator_pool_amount, total_vip_reads, rate_per_read, is_distributed)
    VALUES (target_month, v_total_revenue, v_pool_size, v_total_reads, v_calculated_rate, TRUE)
    ON CONFLICT (month_date) DO UPDATE SET
        total_revenue = v_total_revenue,
        translator_pool_amount = v_pool_size,
        total_vip_reads = v_total_reads,
        rate_per_read = v_calculated_rate,
        is_distributed = TRUE,
        updated_at = NOW();

    -- F. Distribute to Translators (Monthly Stats)
    UPDATE translator_monthly_stats tms
    SET total_earnings = tms.vip_reads * v_calculated_rate
    WHERE tms.month_date = target_month;

    -- G. Update Lifetime Balances
    UPDATE translator_stats ts
    SET 
        total_earnings = ts.total_earnings + (tms.vip_reads * v_calculated_rate),
        current_balance = ts.current_balance + (tms.vip_reads * v_calculated_rate)
    FROM translator_monthly_stats tms
    WHERE ts.translator_id = tms.translator_id
    AND tms.month_date = target_month;

    GET DIAGNOSTICS v_translators_paid = ROW_COUNT;

    RETURN QUERY SELECT v_pool_size, v_total_reads, v_calculated_rate, v_translators_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permission
GRANT EXECUTE ON FUNCTION get_monthly_vip_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_monthly_royalties_auto TO authenticated;

NOTIFY pgrst, 'reload schema';
