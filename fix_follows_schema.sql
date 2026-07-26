-- FIX FOLLOWS TABLE SCHEMA
-- Run this in Supabase SQL Editor to fix the "Rate/Follow" button issue.

-- 1. Create follows table if it doesn't exist (Corrected Syntax)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    webtoon_id BIGINT REFERENCES public.webtoons(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, webtoon_id)
);

-- 2. Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 3. Re-create Policies (Drop first to ensure clean state)
DROP POLICY IF EXISTS "Users can view their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

CREATE POLICY "Users can view their own follows"
    ON public.follows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
    ON public.follows FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Add follows count column to webtoons if it doesn't exist
ALTER TABLE public.webtoons ADD COLUMN IF NOT EXISTS follow_count INT DEFAULT 0;

-- 5. Helper function for follow count
CREATE OR REPLACE FUNCTION public.handle_follow_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.webtoons
        SET follow_count = follow_count + 1
        WHERE id = NEW.webtoon_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.webtoons
        SET follow_count = GREATEST(0, follow_count - 1)
        WHERE id = OLD.webtoon_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger
DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_follow_count();
