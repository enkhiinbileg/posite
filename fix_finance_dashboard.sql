
-- Fix Admin Finance Dashboard Issues

-- 1. Add Foreign Key to Profiles for easier joining
-- This allows: .select('*, profile:profiles(...)')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'translator_stats_profiles_fkey'
    ) THEN
        ALTER TABLE translator_stats
        ADD CONSTRAINT translator_stats_profiles_fkey
        FOREIGN KEY (translator_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Grant Admin Access to Translator Stats
DROP POLICY IF EXISTS "Admins can view all translator stats" ON translator_stats;
CREATE POLICY "Admins can view all translator stats" ON translator_stats
    FOR SELECT
    USING (
        (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 3. Grant Admin Access to Commissions (if not already exists)
DROP POLICY IF EXISTS "Admins can view all commissions" ON commissions;
CREATE POLICY "Admins can view all commissions" ON commissions
    FOR SELECT
    USING (
        (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
    );


DO $$
BEGIN
    RAISE NOTICE '✅ Permissions and Keys fixed for Finance Dashboard!';
END $$;
