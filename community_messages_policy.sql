-- community_messages хүснэгтэд хүн бүр (нэвтэрсэн бол) унших эрхтэй байх ёстой
create policy "Anyone can view messages"
    on public.community_messages for select
    using (true);

-- Мөн insert эрх
create policy "Authenticated users can insert messages"
    on public.community_messages for insert
    with check (auth.uid() = user_id);
