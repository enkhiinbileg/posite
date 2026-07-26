-- Create table for tracking daily attendance
create table if not exists public.moderator_attendance (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    work_date date default current_date not null,
    check_in timestamptz default now() not null,
    check_out timestamptz,
    total_hours numeric(5,2), -- Calculated hours
    created_at timestamptz default now() not null
);

-- Create table for tracking specific work logs
create table if not exists public.moderator_work_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    attendance_id uuid references public.moderator_attendance(id) on delete set null,
    task_description text not null,
    resource_link text,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.moderator_attendance enable row level security;
alter table public.moderator_work_logs enable row level security;

-- Policies for moderator_attendance

-- 1. Users can insert their own attendance (Check-in)
create policy "Users can insert their own attendance"
on public.moderator_attendance for insert
with check (auth.uid() = user_id);

-- 2. Users can view their own attendance
create policy "Users can view their own attendance"
on public.moderator_attendance for select
using (auth.uid() = user_id);

-- 3. Users can update their own attendance (Check-out)
create policy "Users can update their own attendance"
on public.moderator_attendance for update
using (auth.uid() = user_id);

-- Policies for moderator_work_logs

-- 1. Users can insert their own logs
create policy "Users can insert their own logs"
on public.moderator_work_logs for insert
with check (auth.uid() = user_id);

-- 2. Users can view their own logs
create policy "Users can view their own logs"
on public.moderator_work_logs for select
using (auth.uid() = user_id);

-- 3. Users can update their own logs
create policy "Users can update their own logs"
on public.moderator_work_logs for update
using (auth.uid() = user_id);

-- ADMIN POLICIES (Assuming there is a way to identify admins, otherwise these tables might need open read for specific authorized users. 
-- For now, I'll add a policy that allows everything if the user has a specific email or role if you have one setup.
-- If not, you might need to run these manually or adjust. 
-- Adding a generic "Admins can view all" if you have an is_admin function, otherwise skipping for now to rely on Supabase Dashboard or adding distinct admin logic later.)
