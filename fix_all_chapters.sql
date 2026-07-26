
-- 🔴 ЧУХАЛ: Энэ файлыг ажиллуулахдаа доорх 'EMAIL' хэсгийг өөрийн ОРЧУУЛАГЧИЙН ИМЭЙЛ-ээр солино уу!

DO $$
DECLARE
    -- 👇 ЭНД ӨӨРИЙН ИМЭЙЛЭЭ БИЧНЭ ҮҮ (Орчуулагчийн эрхтэй хаяг)
    target_email TEXT := 'YOUR_TRANSLATOR_EMAIL@GMAIL.COM'; 
    
    target_user_id UUID;
BEGIN
    -- 1. Хэрэглэгчийн ID-г олох
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION '❌ Алдаа: % гэсэн имэйлтэй хэрэглэгч олдсонгүй! Имэйлээ зөв бичсэн эсэхээ шалгана уу.', target_email;
    ELSE
        RAISE NOTICE '✅ Хэрэглэгч олдлоо: %', target_user_id;

        -- 2. БҮХ БҮЛГИЙГ энэ хэрэглэгч рүү шилжүүлэх (Force Claim)
        -- Өмнө нь Admin ID руу орсон байж болзошгүй тул "NULL"-ийг шалгахгүйгээр бүгдийг шилжүүлж байна.
        UPDATE chapters 
        SET translator_id = target_user_id;
        
        RAISE NOTICE '✅ Бүх бүлгүүдийг таны нэр дээр шилжүүллээ!';

        -- 3. Trigger-ийг шинэчлэх (UPDATE дээр ажилладаг болгох)
        -- Ингэснээр дараа дахин шилжүүлэг хийхэд тоо автоматаар шинэчлэгдэнэ.
       EXECUTE '
            CREATE OR REPLACE FUNCTION update_translator_chapter_stats()
            RETURNS TRIGGER AS $func$
            BEGIN
                IF (TG_OP = ''INSERT'') THEN
                    IF NEW.translator_id IS NOT NULL THEN
                        INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
                        VALUES (NEW.translator_id, 1, NOW())
                        ON CONFLICT (translator_id)
                        DO UPDATE SET total_chapters_translated = translator_stats.total_chapters_translated + 1;
                    END IF;
                ELSIF (TG_OP = ''DELETE'') THEN
                    IF OLD.translator_id IS NOT NULL THEN
                        UPDATE translator_stats
                        SET total_chapters_translated = GREATEST(0, total_chapters_translated - 1)
                        WHERE translator_id = OLD.translator_id;
                    END IF;
                ELSIF (TG_OP = ''UPDATE'') THEN
                    IF OLD.translator_id IS DISTINCT FROM NEW.translator_id THEN
                        IF OLD.translator_id IS NOT NULL THEN
                            UPDATE translator_stats
                            SET total_chapters_translated = GREATEST(0, total_chapters_translated - 1)
                            WHERE translator_id = OLD.translator_id;
                        END IF;
                        IF NEW.translator_id IS NOT NULL THEN
                            INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
                            VALUES (NEW.translator_id, 1, NOW())
                            ON CONFLICT (translator_id)
                            DO UPDATE SET total_chapters_translated = translator_stats.total_chapters_translated + 1;
                        END IF;
                    END IF;
                END IF;
                RETURN NULL;
            END;
            $func$ LANGUAGE plpgsql SECURITY DEFINER;
        ';
        
        -- Trigger-ийг дахин үүсгэх
        EXECUTE 'DROP TRIGGER IF EXISTS on_chapter_change_update_stats ON chapters';
        EXECUTE 'CREATE TRIGGER on_chapter_change_update_stats AFTER INSERT OR DELETE OR UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_translator_chapter_stats()';

        RAISE NOTICE '✅ Trigger шинэчлэгдлээ. (UPDATE дэмждэг болсон)';

        -- 4. Статистикийг 0-ээс эхлэн дахин тооцох (Force Recalculate)
        -- Хуучин буруу тоонуудыг цэвэрлэх
        TRUNCATE TABLE translator_stats; 
        
        -- Шинээр тоолж оруулах
        INSERT INTO translator_stats (translator_id, total_chapters_translated, updated_at)
        SELECT translator_id, COUNT(*), NOW()
        FROM chapters
        WHERE translator_id IS NOT NULL
        GROUP BY translator_id;

        RAISE NOTICE '✅ Статистик тоог дахин бодож шинэчиллээ!';
        RAISE NOTICE '🎉 БҮХ ЗҮЙЛ ЗАСТАРЛАА! Орчуулагчийн самбараа Refresh хийнэ үү.';
    END IF;
END $$;
