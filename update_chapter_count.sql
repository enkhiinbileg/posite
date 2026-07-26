-- Trigger to update chapter_count_label on webtoons table
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

-- Initial sync for existing data (Optimized to avoid timeouts)
UPDATE webtoons w
SET chapter_count_label = sub.cnt || ' Бүлэг'
FROM (
    SELECT webtoon_id, count(*) as cnt
    FROM chapters
    GROUP BY webtoon_id
) sub
WHERE w.id = sub.webtoon_id;
