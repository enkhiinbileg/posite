-- 1. Create custom_fonts table
create table if not exists custom_fonts (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    url text not null,
    user_id uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table custom_fonts enable row level security;

-- 3. Policies for custom_fonts
-- Drop existing policies if any to avoid errors on re-run
drop policy if exists "Anyone can view custom fonts" on custom_fonts;
drop policy if exists "Authenticated users can insert custom fonts" on custom_fonts;
drop policy if exists "Users can delete their own fonts" on custom_fonts;

create policy "Anyone can view custom fonts"
on custom_fonts for select
using ( true );

create policy "Authenticated users can insert custom fonts"
on custom_fonts for insert
with check ( auth.role() = 'authenticated' );

create policy "Users can delete their own fonts"
on custom_fonts for delete
using ( auth.uid() = user_id );

-- 4. Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('fonts', 'fonts', true)
on conflict (id) do nothing;

-- Storage Policies (Unique names to avoid collision)
drop policy if exists "Public Access Fonts" on storage.objects;
drop policy if exists "Authenticated users upload fonts" on storage.objects;
drop policy if exists "Users update own fonts" on storage.objects;
drop policy if exists "Users delete own fonts" on storage.objects;

create policy "Public Access Fonts"
on storage.objects for select
using ( bucket_id = 'fonts' );

create policy "Authenticated users upload fonts"
on storage.objects for insert
with check ( bucket_id = 'fonts' and auth.role() = 'authenticated' );

create policy "Users update own fonts"
on storage.objects for update
using ( bucket_id = 'fonts' and auth.uid() = owner )
with check ( bucket_id = 'fonts' and auth.uid() = owner );

create policy "Users delete own fonts"
on storage.objects for delete
using ( bucket_id = 'fonts' and auth.uid() = owner );
