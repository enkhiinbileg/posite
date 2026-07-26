-- Minimal chapter scheduler support.
-- The app uses:
--   is_published = false + published_at in the future => scheduled
--   is_published = false + published_at in the past => due for cron publish
--   is_published = true  + published_at <= now() => public

-- Add published_at column to chapters
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- Update existing chapters to have the value of their date column (if it exists)
UPDATE public.chapters SET published_at = date WHERE published_at IS NULL AND date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chapters_scheduled_publish
ON public.chapters (is_published, published_at)
WHERE is_published = false AND published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chapters_public_visibility
ON public.chapters (webtoon_id, is_published, published_at);
