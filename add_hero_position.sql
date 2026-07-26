-- Add hero_position column to webtoons table
ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS hero_position INTEGER DEFAULT 20;

-- Optional: Update existing webtoons to have a default value if needed (though DEFAULT 20 handles it)
UPDATE webtoons SET hero_position = 20 WHERE hero_position IS NULL;
