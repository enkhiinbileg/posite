-- Optimize reading_progress lookups
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_updated_at ON public.reading_progress(last_read_at DESC);

-- Optimize likes count lookups
CREATE INDEX IF NOT EXISTS idx_likes_chapter_id ON public.likes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- Explicitly analyze tables to update statistics
ANALYZE public.reading_progress;
ANALYZE public.likes;
