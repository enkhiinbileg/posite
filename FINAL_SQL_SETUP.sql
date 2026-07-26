-- Consolidated SQL for Moderator Permissions & VIP Logic
-- Run this in your Supabase SQL Editor

-- 1. MODERATOR PERMISSIONS
-- Note: In Supabase, we rely on RLS policies and the 'authenticated' role.
-- We don't need to create a custom 'moderator' Postgres role.

-- Add RLS policies for moderator if not already present
-- Policy for webtoons
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Moderators can manage webtoons') THEN
        CREATE POLICY "Moderators can manage webtoons" ON webtoons 
        FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM profiles WHERE is_moderator = true));
    END IF;
END $$;

-- Policy for chapters
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Moderators can manage chapters') THEN
        CREATE POLICY "Moderators can manage chapters" ON chapters 
        FOR ALL USING (auth.jwt() ->> 'email' IN (SELECT email FROM profiles WHERE is_moderator = true));
    END IF;
END $$;

-- 2. SCHEMA UPDATE (VIP LOGIC)
-- Add free_chapters column to webtoons table
ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS free_chapters INTEGER DEFAULT 1;
