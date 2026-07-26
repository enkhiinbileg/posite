-- Webtoon Ownership & RLS Schema
-- Run this in your Supabase SQL Editor

-- 1. Add created_by column to webtoons if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webtoons' AND column_name = 'created_by') THEN
        ALTER TABLE webtoons ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- 2. Add created_by column to chapters if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'created_by') THEN
        ALTER TABLE chapters ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE webtoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Webtoons

-- VIEW: Everyone can view (or restrict to published later)
DROP POLICY IF EXISTS "Public can view webtoons" ON webtoons;
CREATE POLICY "Public can view webtoons" ON webtoons FOR SELECT USING (true);

-- INSERT: Admins and Translators can create
DROP POLICY IF EXISTS "Admins and Translators can create webtoons" ON webtoons;
CREATE POLICY "Admins and Translators can create webtoons" ON webtoons FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true OR is_translator = true)
);

-- UPDATE: Admins (all) OR Owner (own)
DROP POLICY IF EXISTS "Owners and Admins can update webtoons" ON webtoons;
CREATE POLICY "Owners and Admins can update webtoons" ON webtoons FOR UPDATE
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- DELETE: Admins (all) OR Owner (own)
DROP POLICY IF EXISTS "Owners and Admins can delete webtoons" ON webtoons;
CREATE POLICY "Owners and Admins can delete webtoons" ON webtoons FOR DELETE
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);


-- 5. Policies for Chapters

-- VIEW: Everyone can view
DROP POLICY IF EXISTS "Public can view chapters" ON chapters;
CREATE POLICY "Public can view chapters" ON chapters FOR SELECT USING (true);

-- INSERT: Admins and Translators can create
DROP POLICY IF EXISTS "Admins and Translators can create chapters" ON chapters;
CREATE POLICY "Admins and Translators can create chapters" ON chapters FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true OR is_translator = true)
);

-- UPDATE: Admins (all) OR Owner (own)
DROP POLICY IF EXISTS "Owners and Admins can update chapters" ON chapters;
CREATE POLICY "Owners and Admins can update chapters" ON chapters FOR UPDATE
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- DELETE: Admins (all) OR Owner (own)
DROP POLICY IF EXISTS "Owners and Admins can delete chapters" ON chapters;
CREATE POLICY "Owners and Admins can delete chapters" ON chapters FOR DELETE
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
