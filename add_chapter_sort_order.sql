-- Add sort_order column to chapters table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapters' AND column_name = 'sort_order') THEN
        ALTER TABLE chapters ADD COLUMN sort_order INTEGER;
        
        -- Initialize sort_order with id or a sequence
        UPDATE chapters SET sort_order = id;
    END IF;
END $$;
