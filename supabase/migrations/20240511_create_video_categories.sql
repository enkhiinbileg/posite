-- Create video_categories table
CREATE TABLE IF NOT EXISTS public.video_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view active video categories" ON public.video_categories;
CREATE POLICY "Anyone can view active video categories" ON public.video_categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage video categories" ON public.video_categories;
CREATE POLICY "Admins can manage video categories" ON public.video_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_admin = true OR profiles.is_moderator = true)
        )
    );

-- Seed default categories matching screenshot
INSERT INTO public.video_categories (name, slug, sort_order) VALUES
('Friend', 'friend', 1),
('Japanese', 'japanese', 2),
('Anime', 'anime', 3),
('Korean', 'korean', 4),
('Teen 18+', 'teen-18', 5),
('Cheating', 'cheating', 6),
('Hot Mom', 'hot-mom', 7),
('Public', 'public', 8),
('Japanese Hardcore', 'japanese-hardcore', 9),
('POV (Point Of View)', 'pov', 10),
('Homemade', 'homemade', 11),
('Chinese Teen 18+', 'chinese-teen-18', 12),
('Skinny Big Tits', 'skinny-big-tits', 13),
('Uncensored', 'uncensored', 14),
('Cum Inside', 'cum-inside', 15),
('Animation', 'animation', 16),
('Goth', 'goth', 17),
('Hardcore Fuck', 'hardcore-fuck', 18),
('Hentai', 'hentai', 19),
('Asian Homemade', 'asian-homemade', 20),
('Story', 'story', 21),
('Surprise Mom', 'surprise-mom', 22),
('Japanese Hot Mom', 'japanese-hot-mom', 23),
('Massage', 'massage', 24)
ON CONFLICT (slug) DO NOTHING;
