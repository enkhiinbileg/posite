-- Add parent_id to comments for nested replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster retrieval of replies
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
