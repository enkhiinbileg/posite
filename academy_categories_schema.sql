-- Create Editor Academy Categories table
CREATE TABLE IF NOT EXISTS public.editor_academy_categories (
    id text PRIMARY KEY, -- e.g., 'tools', 'typography'
    title text NOT NULL,
    icon text NOT NULL, -- Lucide icon name stored as text
    color text NOT NULL, -- Tailwind class string
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editor_academy_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view categories" ON public.editor_academy_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.editor_academy_categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_moderator = true)
  )
);

-- Seed initial categories (migrate from hardcoded)
INSERT INTO public.editor_academy_categories (id, title, icon, color, order_index)
VALUES 
('tools', 'Ухаалаг хэрэгслүүд', 'Wand2', 'text-primary', 0),
('typography', 'Үсгийн соёл', 'Type', 'text-blue-500', 1),
('hotkeys', 'Халуун товчнууд', 'Command', 'text-yellow-500', 2),
('pro-tips', 'Pro Tips', 'Star', 'text-purple-500', 3)
ON CONFLICT (id) DO NOTHING;

-- Add foreign key constraint to lessons (optional but recommended)
-- ALTER TABLE public.editor_academy_lessons 
-- ADD CONSTRAINT fk_category 
-- FOREIGN KEY (category) 
-- REFERENCES public.editor_academy_categories (id) 
-- ON DELETE CASCADE;
