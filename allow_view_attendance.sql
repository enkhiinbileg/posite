-- Allow Moderators/Admins to view ALL attendance records (to see who is online)
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.moderator_attendance;

CREATE POLICY "Moderators can view all attendance"
ON public.moderator_attendance FOR SELECT
USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and (profiles.is_moderator = true OR profiles.is_admin = true)
  )
);

-- Note: We still restrict UPDATE/INSERT to own rows, but SELECT is now open for mods.
