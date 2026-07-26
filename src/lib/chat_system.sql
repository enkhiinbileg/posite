-- Drop existing policies
drop policy if exists "Users can view their own conversation" on public.chat_conversations;
drop policy if exists "Admins can view all conversations" on public.chat_conversations;
drop policy if exists "Users can insert their own conversation" on public.chat_conversations;
drop policy if exists "Users can update their own conversation" on public.chat_conversations;
drop policy if exists "Admins can update all conversations" on public.chat_conversations;

drop policy if exists "Users can view messages in their conversation" on public.chat_messages;
drop policy if exists "Admins can view all messages" on public.chat_messages;
drop policy if exists "Users can insert messages" on public.chat_messages;
drop policy if exists "Admins can insert messages" on public.chat_messages;

-- Create tables
create table if not exists public.chat_conversations (
    id uuid not null default gen_random_uuid() primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_message text,
    constraint chat_conversations_user_id_key unique (user_id)
);

create table if not exists public.chat_messages (
    id uuid not null default gen_random_uuid() primary key,
    conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete cascade,
    content text not null,
    is_admin boolean not null default false,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

-- Indexes
create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
create index if not exists idx_chat_conversations_updated_at on public.chat_conversations(updated_at desc);

-- RLS
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Policies
create policy "Users can view their own conversation"
    on public.chat_conversations for select using (auth.uid() = user_id);

create policy "Admins can view all conversations"
    on public.chat_conversations for select using (
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    );

create policy "Users can insert their own conversation"
    on public.chat_conversations for insert with check (auth.uid() = user_id);

create policy "Users can update their own conversation"
    on public.chat_conversations for update using (auth.uid() = user_id);

create policy "Admins can update all conversations"
    on public.chat_conversations for update using (
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    );

create policy "Users can view messages in their conversation"
    on public.chat_messages for select using (
        exists (select 1 from public.chat_conversations where id = chat_messages.conversation_id and user_id = auth.uid())
    );

create policy "Admins can view all messages"
    on public.chat_messages for select using (
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    );

create policy "Users can insert messages"
    on public.chat_messages for insert with check (
        exists (select 1 from public.chat_conversations where id = conversation_id and user_id = auth.uid())
    );

create policy "Admins can insert messages"
    on public.chat_messages for insert with check (
        exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    );

-- ENABLE REALTIME
-- This is crucial for the listeners to work immediately
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_messages;
