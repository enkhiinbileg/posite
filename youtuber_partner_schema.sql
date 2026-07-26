-- YouTuber Partner Program - Schema Updates
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_channel_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_channel_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamptz;

-- Enable RLS for users to update their own bank details
CREATE POLICY "Users can update own partner details" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
