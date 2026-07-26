
-- Enable Auto-Revenue Calculation
-- Logic: 1 View = 10 MNT (Example Rate)

-- 1. Update Function to Calculate Earnings
CREATE OR REPLACE FUNCTION calculate_translator_revenue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if views changed
    IF NEW.views IS DISTINCT FROM OLD.views THEN
        UPDATE translator_stats
        SET 
            -- Revenue = Total Views * Rate (10 MNT)
            -- Note: In a real app, you might want a separate 'transactions' table. 
            total_earnings = (SELECT SUM(views) FROM chapters WHERE translator_id = NEW.translator_id) * 10,
            
            -- Balance also updates (Simplified logic: Balance = Earnings - Payouts)
            -- Assuming payouts are tracked elsewhere, but for now we sync balance to earnings check
            current_balance = (SELECT SUM(views) FROM chapters WHERE translator_id = NEW.translator_id) * 10
        WHERE translator_id = NEW.translator_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create/Update Trigger on Chapters
DROP TRIGGER IF EXISTS on_chapter_view_update_revenue ON chapters;

CREATE TRIGGER on_chapter_view_update_revenue
AFTER UPDATE OF views OR INSERT ON chapters
FOR EACH ROW
EXECUTE FUNCTION calculate_translator_revenue();

-- 3. Backfill Revenue for existing views
DO $$
BEGIN
    UPDATE translator_stats ts
    SET 
        total_earnings = (
            SELECT COALESCE(SUM(views), 0) * 10 
            FROM chapters c 
            WHERE c.translator_id = ts.translator_id
        ),
        current_balance = (
            SELECT COALESCE(SUM(views), 0) * 10 
            FROM chapters c 
            WHERE c.translator_id = ts.translator_id
        );
END $$;

RAISE NOTICE '✅ Revenue System Activated! Rate: 10 MNT/View';
