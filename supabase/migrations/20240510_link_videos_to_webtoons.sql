-- Add webtoon_id to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS webtoon_id UUID REFERENCES public.webtoons(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_videos_webtoon_id ON public.videos(webtoon_id);
