-- 1. Add tracking columns
alter table public.webtoons add column if not exists uploaded_by uuid references public.profiles(id);
alter table public.chapters add column if not exists uploaded_by uuid references public.profiles(id);

-- 2. Trigger to auto-fill uploaded_by
create or replace function public.set_uploaded_by()
returns trigger as $$
begin
  if new.uploaded_by is null then
    new.uploaded_by := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_webtoon_insert_uploaded_by on public.webtoons;
create trigger on_webtoon_insert_uploaded_by
  before insert on public.webtoons
  for each row execute procedure public.set_uploaded_by();

drop trigger if exists on_chapter_insert_uploaded_by on public.chapters;
create trigger on_chapter_insert_uploaded_by
  before insert on public.chapters
  for each row execute procedure public.set_uploaded_by();

-- 3. Leaderboard Calculation Function
create or replace function get_moderator_rankings(
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns table (
  moderator_id uuid,
  full_name text,
  avatar_url text,
  username text,
  total_points bigint,
  chapters_count bigint,
  webtoons_count bigint,
  messages_count bigint
) as $$
begin
  -- Default to beginning of time if null, to allow full calculation
  if period_start is null then
     period_start := '2000-01-01'::timestamptz;
  end if;
  
  if period_end is null then
     period_end := now();
  end if;

  return query
  select 
    p.id as moderator_id,
    p.full_name,
    p.avatar_url,
    p.username,
    (
      (count(distinct c.id) * 10) + -- 10 points per chapter
      (count(distinct w.id) * 50) + -- 50 points per webtoon
      (count(distinct m.id) * 2)    -- 2 points per message reply
    )::bigint as total_points,
    count(distinct c.id)::bigint as chapters_count,
    count(distinct w.id)::bigint as webtoons_count,
    count(distinct m.id)::bigint as messages_count
  from public.profiles p
  left join public.chapters c on c.uploaded_by = p.id and c.created_at between period_start and period_end
  left join public.webtoons w on w.uploaded_by = p.id and w.created_at between period_start and period_end
  left join public.chat_messages m on m.sender_id = p.id and m.is_admin = true and m.created_at between period_start and period_end
  where p.is_moderator = true or p.is_admin = true
  group by p.id, p.full_name, p.avatar_url, p.username
  order by total_points desc;
end;
$$ language plpgsql security definer;
