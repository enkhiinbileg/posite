-- Create site_settings table to store global configurations
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial value for NSFW free period
INSERT INTO site_settings (key, value, description) 
VALUES ('is_nsfw_free_period', 'false'::jsonb, 'Temporarily make all +18 content free')
ON CONFLICT (key) DO NOTHING;

-- Grant access to authenticated users (admins will update this)
-- Assuming you have an admin check in your application logic
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to site_settings" 
ON site_settings FOR SELECT USING (true);

-- Only admins should be able to update site_settings
-- This policy assumes a column is_admin in profiles table
CREATE POLICY "Allow admins to update site_settings" 
ON site_settings FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);
