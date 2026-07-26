-- Seed Webtoons
INSERT INTO webtoons (id, title, author, rating, description, image, chapter_count_label, is_new, genres)
VALUES 
(1, 'Алтан Камуй', 'Satoru Noda', 4.9, 'Хоккайдогийн зэлүүд нутагт Сагири хэмээх эр болон Айнү охин Асирпа нар нуугдмал алтны эрэлд гарна.', 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=1200', '20 Бүлэг', true, ARRAY['ACTION', 'ADVENTURE', 'HISTORICAL']),
(2, 'Баатарын Авьяастан', 'Hideyuki Furuhashi', 4.8, 'Гайхалтай хүч чадалтай ч түүнийгээ нууцлан амьдрах нэгэн баатрын түүх.', 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=1200', '15 Бүлэг', true, ARRAY['ACTION', 'FANTASY', 'COMEDY']),
(3, 'Синжа Хулгайч', 'Jasmine', 4.7, 'Орчин үеийн Сөүл хотод өрнөх хайр дурлал, адал явдлын түүх.', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200', '42 Бүлэг', false, ARRAY['ROMANCE', 'DRAMA']),
(4, 'Ид шид ба Булчин', 'Hajime Komoto', 4.6, 'Ид шидтэй ертөнцөд зөвхөн булчингийн хүчээр бүхнийг шийдэх Мэш хүүгийн түүх.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200', '10 Бүлэг', true, ARRAY['ACTION', 'COMEDY', 'FANTASY']),
(5, 'Шуламтай хамт бичсэн өдрийн тэмдэглэл', 'Enako', 4.9, 'Нууцлаг шулам болон жирийн нэгэн залуугийн хооронд өрнөх ер бусын түүх.', 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=1200', '5 Бүлэг', true, ARRAY['ROMANCE', 'SUPERNATURAL', 'MYSTERY'])
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    author = EXCLUDED.author,
    rating = EXCLUDED.rating,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    chapter_count_label = EXCLUDED.chapter_count_label,
    is_new = EXCLUDED.is_new,
    genres = EXCLUDED.genres;

-- Seed Chapters for Altan Kamuy (id: 1)
INSERT INTO chapters (id, webtoon_id, title, chapter_number, images)
VALUES
(1, 1, 'Бүлэг 1: Ангууч', 1, ARRAY['https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=1000', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000']),
(2, 1, 'Бүлэг 2: Алтны эрэл', 2, ARRAY['https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000', 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=1000']),
(3, 1, 'Бүлэг 3: Алтан газрын зураг', 3, ARRAY['https://images.unsplash.com/photo-1607604276583?q=80&w=1000', 'https://images.unsplash.com/photo-1516062423079?q=80&w=1000'])
ON CONFLICT (id) DO UPDATE SET
    webtoon_id = EXCLUDED.webtoon_id,
    title = EXCLUDED.title,
    chapter_number = EXCLUDED.chapter_number,
    images = EXCLUDED.images;
