-- Channels Table
create table if not exists community_channels (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  type text check (type in ('public', 'private', 'role_based')) default 'role_based',
  allowed_roles text[] default '{}', -- e.g. ['translator', 'youtuber', 'admin']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table
create table if not exists community_messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references community_channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null not null,
  content text check (char_length(content) < 5000), -- Limit message length
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_deleted boolean default false
);

-- Add indexes for better performance
create index if not exists community_messages_channel_id_idx on community_messages(channel_id);
create index if not exists community_messages_created_at_idx on community_messages(created_at desc);

-- Enable RLS
alter table community_channels enable row level security;
alter table community_messages enable row level security;

-- Policies for Channels

-- 1. View Channels: Users can see channels if they have one of the allowed roles
create or replace function public.has_role(required_roles text[])
returns boolean as $$
declare
  user_roles text[];
  is_admin boolean;
  is_translator boolean;
  is_youtuber boolean;
begin
  select 
    p.is_admin, p.is_translator, p.is_youtuber
  into 
    is_admin, is_translator, is_youtuber
  from profiles p
  where p.id = auth.uid();

  -- Admin has access to everything
  if is_admin then return true; end if;

  -- Build user's role list
  user_roles := array[]::text[];
  if is_translator then user_roles := array_append(user_roles, 'translator'); end if;
  if is_youtuber then user_roles := array_append(user_roles, 'youtuber'); end if;

  -- Check overlap
  return (user_roles && required_roles);
end;
$$ language plpgsql security definer;

create policy "Users can view channels they have access to"
  on community_channels for select
  using (
    -- Admin always sees everything
    (select is_admin from profiles where id = auth.uid()) = true
    or
    -- Check if user's role overlaps with allowed_roles
    public.has_role(allowed_roles)
  );

-- Policies for Messages

-- 1. View Messages: If you can see the channel, you can see the messages
create policy "Users can view messages in allowed channels"
  on community_messages for select
  using (
    exists (
      select 1 from community_channels c
      where c.id = community_messages.channel_id
      and (
        (select is_admin from profiles where id = auth.uid()) = true
        or
        public.has_role(c.allowed_roles)
      )
    )
  );

-- 2. Insert Messages: Must be authenticated and have access to channel
create policy "Users can insert messages in allowed channels"
  on community_messages for insert
  with check (
    auth.uid() = user_id -- Can only post as self
    and
    exists (
      select 1 from community_channels c
      where c.id = community_messages.channel_id
      and (
        (select is_admin from profiles where id = auth.uid()) = true
        or
        public.has_role(c.allowed_roles)
      )
    )
  );

-- Seed Default Channels
insert into community_channels (slug, name, allowed_roles)
values 
  ('general', 'Нийтийн Чат', array['translator', 'youtuber']),
  ('translators', 'Орчуулагчдын Чат', array['translator']),
  ('youtubers', 'YouTuber Чат', array['youtuber']),
  ('announcements', 'Зарлал', array['translator', 'youtuber'])
on conflict (slug) do nothing;
