
-- Table for storing weekly release schedules for webtoons
CREATE TABLE IF NOT EXISTS public.webtoon_schedules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    webtoon_id bigint REFERENCES public.webtoons(id) ON DELETE CASCADE NOT NULL,
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Sunday, 1: Monday, ..., 6: Saturday
    release_time time, -- Optional specific release time
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(webtoon_id, day_of_week)
);

-- Table for moderator-specific calendar tasks
CREATE TABLE IF NOT EXISTS public.moderator_calendar_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    color text DEFAULT '#3b82f6', -- Default blue color for the task in calendar
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.webtoon_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_calendar_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for webtoon_schedules
CREATE POLICY "Everyone can view webtoon schedules" 
ON public.webtoon_schedules FOR SELECT USING (true);

CREATE POLICY "Admins and Moderators can manage webtoon schedules" 
ON public.webtoon_schedules FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true)
    )
);

-- Policies for moderator_calendar_tasks
CREATE POLICY "Users can manage their own calendar tasks" 
ON public.moderator_calendar_tasks FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all calendar tasks" 
ON public.moderator_calendar_tasks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_webtoon_schedules_day ON public.webtoon_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_mod_tasks_user_date ON public.moderator_calendar_tasks(user_id, start_time);
