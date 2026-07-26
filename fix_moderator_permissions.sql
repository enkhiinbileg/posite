-- Webtoons Table Policies
DROP POLICY IF EXISTS "Moderators can insert webtoons" ON public.webtoons;
CREATE POLICY "Moderators can insert webtoons" ON public.webtoons
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true)
    );

DROP POLICY IF EXISTS "Moderators can update webtoons" ON public.webtoons;
CREATE POLICY "Moderators can update webtoons" ON public.webtoons
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true)
    );

-- Chapters Table Policies
DROP POLICY IF EXISTS "Moderators can insert chapters" ON public.chapters;
CREATE POLICY "Moderators can insert chapters" ON public.chapters
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true)
    );

DROP POLICY IF EXISTS "Moderators can update chapters" ON public.chapters;
CREATE POLICY "Moderators can update chapters" ON public.chapters
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true)
    );

-- Storage Policies (bucket: 'images')
DROP POLICY IF EXISTS "Moderators can upload images" ON storage.objects;
CREATE POLICY "Moderators can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND (auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true))
    );

DROP POLICY IF EXISTS "Moderators can update images" ON storage.objects;
CREATE POLICY "Moderators can update images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'images' 
        AND (auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true))
    );

DROP POLICY IF EXISTS "Moderators can delete images" ON storage.objects;
CREATE POLICY "Moderators can delete images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images' 
        AND (auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true OR is_admin = true))
    );
