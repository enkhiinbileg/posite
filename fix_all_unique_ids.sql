
-- 1. Ensure the function exists
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
        new_id := floor(10000000 + random() * 89999999)::text;
        perform 1 from profiles where unique_id = new_id;
        IF NOT FOUND THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN new_id;
END;
$$;

-- 2. Backfill ALL users who still have NULL unique_id
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

-- 3. Confirm trigger is active for future users
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
