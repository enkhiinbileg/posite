-- 1. Add unique_id column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE;

-- 2. Function to generate random unique ID
CREATE OR REPLACE FUNCTION generate_unique_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_id TEXT;
    done BOOLEAN;
BEGIN
    done := FALSE;
    WHILE NOT done LOOP
        -- Generate a random 8-character string (Numbers + Uppercase Letters)
        -- Using substring of md5 random to get hex is easy, but let's try to be more readable
        -- Let's stick to 8 digits for simplicity and ease of typing: 10000000 - 99999999
        new_id := floor(10000000 + random() * 89999999)::text;
        
        -- Check if it exists
        perform 1 from profiles where unique_id = new_id;
        IF NOT FOUND THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN new_id;
END;
$$;

-- 3. Trigger to set unique_id on insert
CREATE OR REPLACE FUNCTION set_unique_id_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.unique_id IS NULL THEN
        NEW.unique_id := generate_unique_id();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_unique_id ON profiles;
CREATE TRIGGER ensure_unique_id
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_unique_id_trigger();

-- 4. Backfill existing users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE unique_id IS NULL LOOP
        UPDATE profiles
        SET unique_id = generate_unique_id()
        WHERE id = r.id;
    END LOOP;
END;
$$;
