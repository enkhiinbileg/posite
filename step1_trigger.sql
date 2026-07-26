-- STEP 1: CREATE TRIGGER AND FUNCTION
-- This will automatically update chapter_count_label for ALL NEW chapters added from now on.

CREATE OR REPLACE FUNCTION update_webtoon_chapter_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE webtoons 
        SET chapter_count_label = (
            SELECT count(*) || ' Бүлэг' 
            FROM chapters 
            WHERE webtoon_id = NEW.webtoon_id
        )
        WHERE id = NEW.webtoon_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE webtoons 
        SET chapter_count_label = (
            SELECT count(*) || ' Бүлэг' 
            FROM chapters 
            WHERE webtoon_id = OLD.webtoon_id
        )
        WHERE id = OLD.webtoon_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to chapters table
DROP TRIGGER IF EXISTS tr_update_chapter_count ON chapters;
CREATE TRIGGER tr_update_chapter_count
AFTER INSERT OR DELETE ON chapters
FOR EACH ROW EXECUTE FUNCTION update_webtoon_chapter_count();

-- [SUCCESS] Step 1 complete. Now you can run Step 2.
