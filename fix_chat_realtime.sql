-- 1. Enable Realtime (Already done if you see "already member" error)
-- begin;
--   alter publication supabase_realtime add table community_messages;
-- commit;

-- 2. Verify and Update RLS Policies to ensure they are robust
-- We drop existing policies to be safe and re-create them ensures they are correct
drop policy if exists "Users can view messages in allowed channels" on community_messages;
drop policy if exists "Users can insert messages in allowed channels" on community_messages;

-- Re-create View Policy
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

-- Re-create Insert Policy
create policy "Users can insert messages in allowed channels"
  on community_messages for insert
  with check (
    auth.uid() = user_id
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

-- 3. Grant permissions just in case (usually default public is fine but explicitly setting helps)
grant select, insert on community_channels to authenticated;
grant select, insert on community_messages to authenticated;
