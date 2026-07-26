-- Create Editor Academy Lessons table
CREATE TABLE IF NOT EXISTS public.editor_academy_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    category text NOT NULL, -- 'tools', 'typography', 'hotkeys', 'pro-tips'
    content jsonb DEFAULT '[]', -- List of items/tips
    video_url text, -- Future use for video demos
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editor_academy_lessons ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view lessons" ON public.editor_academy_lessons FOR SELECT USING (true);
CREATE POLICY "Admins can manage lessons" ON public.editor_academy_lessons FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_moderator = true)
  )
);

-- Seed some initial data based on our current static content
INSERT INTO public.editor_academy_lessons (title, description, category, content, order_index)
VALUES 
(
    'Cleaner Mode', 
    'AI-д суурилсан цэвэрлэх функцийг ашиглан ажлаа 10 дахин хурдасгаарай.', 
    'tools', 
    '[{"title": "AI Recognition", "desc": "Clean All товчийг дарснаар AI бүх текстийг автоматаар таньж, арилгах болно."}]'::jsonb, 
    0
),
(
    'Action Style', 
    'Webtoon-ийн уур амьсгалыг зөв Typography ашиглан бүрдүүлээрэй.', 
    'typography', 
    '[{"title": "💥 Action", "desc": "Gradient Red + Black Stroke. Font: Bangers"}]'::jsonb, 
    0
);
