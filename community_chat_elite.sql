-- 1. community_messages хүснэгтэд Reply (Хариу бичих) багана нэмэх
alter table public.community_messages 
add column if not exists parent_id uuid references public.community_messages(id) on delete cascade;

-- 2. Message Reactions хүснэгт үүсгэх
create table if not exists public.community_reactions (
    id uuid default gen_random_uuid() primary key,
    message_id uuid references public.community_messages(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    emoji text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(message_id, user_id, emoji) -- Нэг хэрэглэгч нэг зурваст нэг л эможи өгөх хязгаар (Messenger шиг)
);

-- 3. Seen Receipts (Уншсан төлөв) хүснэгт
create table if not exists public.community_seen_receipts (
    id uuid default gen_random_uuid() primary key,
    message_id uuid references public.community_messages(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    channel_id uuid references public.community_channels(id) on delete cascade not null,
    seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(channel_id, user_id) -- Зөвхөн хамгийн сүүлийн уншсан зурвасыг суваг тус бүрээр хянахад хангалттай
);

-- 4. RLS & Policies
alter table public.community_reactions enable row level security;
alter table public.community_seen_receipts enable row level security;

-- Reactions Policies
create policy "Users can view reactions in allowed channels"
    on public.community_reactions for select
    using (true); -- Бүх хэрэглэгч реакцыг харах боломжтой (Сувагт хандах эрхийг messages хүснэгт хянадаг)

create policy "Users can insert their own reactions"
    on public.community_reactions for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own reactions"
    on public.community_reactions for delete
    using (auth.uid() = user_id);

-- Seen Receipts Policies
create policy "Users can view seen receipts"
    on public.community_seen_receipts for select
    using (true);

create policy "Users can update their own seen status"
    on public.community_seen_receipts for insert
    with check (auth.uid() = user_id);

create policy "Users can modify their own seen status"
    on public.community_seen_receipts for update
    using (auth.uid() = user_id);

-- 5. ENABLE REALTIME (Бодит цагийн үйлдэл)
-- Суваг үүсгэх эсвэл шинэчлэхэд Realtime дээр Reactions болон Seen Receipts-ийг нэмэх
begin;
  alter publication supabase_realtime add table public.community_reactions;
  alter publication supabase_realtime add table public.community_seen_receipts;
commit;

-- Performance Indexes
create index if not exists idx_community_reactions_message_id on public.community_reactions(message_id);
create index if not exists idx_community_seen_receipts_channel_id on public.community_seen_receipts(channel_id);
