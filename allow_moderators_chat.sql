-- Drop existing policies
drop policy if exists "Admins can view all conversations" on public.chat_conversations;
drop policy if exists "Admins can update all conversations" on public.chat_conversations;
drop policy if exists "Admins can view all messages" on public.chat_messages;
drop policy if exists "Admins can insert messages" on public.chat_messages;

-- Create updated policies including moderators
create policy "Admins can view all conversations"
    on public.chat_conversations for select using (
        exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or is_moderator = true))
    );

create policy "Admins can update all conversations"
    on public.chat_conversations for update using (
        exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or is_moderator = true))
    );

create policy "Admins can view all messages"
    on public.chat_messages for select using (
        exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or is_moderator = true))
    );

create policy "Admins can insert messages"
    on public.chat_messages for insert with check (
        exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or is_moderator = true))
    );
