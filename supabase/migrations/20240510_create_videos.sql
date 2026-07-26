-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT NOT NULL,
    price_purchase NUMERIC DEFAULT 0,
    price_rental NUMERIC DEFAULT 0,
    rental_duration_hours INTEGER DEFAULT 24,
    is_free BOOLEAN DEFAULT false,
    is_nsfw BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create video_access table
CREATE TABLE IF NOT EXISTS public.video_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    access_type TEXT CHECK (access_type IN ('purchase', 'rental')) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for purchases
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_access ENABLE ROW LEVEL SECURITY;

-- Policies for videos
DROP POLICY IF EXISTS "Anyone can view non-NSFW videos" ON public.videos;
CREATE POLICY "Anyone can view non-NSFW videos" ON public.videos
    FOR SELECT USING (is_nsfw = false);

DROP POLICY IF EXISTS "Admins can do everything with videos" ON public.videos;
CREATE POLICY "Admins can do everything with videos" ON public.videos
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
    );

-- Policies for video_access
DROP POLICY IF EXISTS "Users can view their own video access" ON public.video_access;
CREATE POLICY "Users can view their own video access" ON public.video_access
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all video access" ON public.video_access;
CREATE POLICY "Admins can view all video access" ON public.video_access
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
    );
