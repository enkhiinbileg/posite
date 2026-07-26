-- Social Logs Table
-- Tracks all posts sent to social media (Facebook, etc.)

create table if not exists public.social_logs (
    id uuid default gen_random_uuid() primary key,
    platform text not null default 'facebook',
    content text,
    image_url text,
    status text check (status in ('success', 'failed')) not null,
    post_id text, -- ID returned from FB
    error_message text,
    created_by uuid references auth.users(id), -- Null if automated
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.social_logs enable row level security;

-- Only Admins can view/insert
create policy "Admins can view social logs"
  on public.social_logs for select
  using (
    (select is_admin from profiles where id = auth.uid()) = true
  );

create policy "Admins can insert social logs"
  on public.social_logs for insert
  with check (
    (select is_admin from profiles where id = auth.uid()) = true
  );
