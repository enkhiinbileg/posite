
-- 🛡️ SECURITY & PERFORMANCE FIXES

-- 1. Enable RLS on all flagged tables
ALTER TABLE IF EXISTS public.finance_monthly_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.translator_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;

-- 2. Finance & Admin Policies
DROP POLICY IF EXISTS "Admins manage finance pools" ON public.finance_monthly_pools;
CREATE POLICY "Admins manage finance pools" ON public.finance_monthly_pools
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins manage monthly stats" ON public.translator_monthly_stats;
CREATE POLICY "Admins manage monthly stats" ON public.translator_monthly_stats
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Translators view own monthly stats" ON public.translator_monthly_stats;
CREATE POLICY "Translators view own monthly stats" ON public.translator_monthly_stats
    FOR SELECT USING (auth.uid() = translator_id);

-- 3. Engagement & Activity Policies
-- XP Logs
DROP POLICY IF EXISTS "Users view own xp logs" ON public.xp_logs;
CREATE POLICY "Users view own xp logs" ON public.xp_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all xp logs" ON public.xp_logs;
CREATE POLICY "Admins view all xp logs" ON public.xp_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Comments
DROP POLICY IF EXISTS "Comments are public" ON public.comments;
CREATE POLICY "Comments are public" ON public.comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can comment" ON public.comments;
CREATE POLICY "Users can comment" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own comments" ON public.comments;
CREATE POLICY "Users update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
CREATE POLICY "Users delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Likes
DROP POLICY IF EXISTS "Likes are public" ON public.likes;
CREATE POLICY "Likes are public" ON public.likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like" ON public.likes;
CREATE POLICY "Users can like" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own likes" ON public.likes;
CREATE POLICY "Users delete own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- 4. PERFORMANCE INDEXES ⚡
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_chapter_id ON public.comments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_chapter_id ON public.likes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_id ON public.xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON public.reading_progress(user_id);
