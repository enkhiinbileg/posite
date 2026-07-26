-- Drop and Recreate for clean setup
DROP TABLE IF EXISTS suggestions;

CREATE TABLE suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'suggestion',
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin (optional, can use direct check in policies)
-- Policies
CREATE POLICY "Public suggestions are viewable by everyone" 
ON suggestions FOR SELECT 
USING (is_public = true OR auth.uid() = user_id OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
));

CREATE POLICY "Authenticated users can create suggestions" 
ON suggestions FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update suggestions" 
ON suggestions FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete suggestions" 
ON suggestions FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
