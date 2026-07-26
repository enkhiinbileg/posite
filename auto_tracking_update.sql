-- Add active_seconds column to track effective work time
ALTER TABLE public.moderator_attendance 
ADD COLUMN IF NOT EXISTS active_seconds integer DEFAULT 0;

-- Function to handle Heartbeat Ping
-- This mimics "Auto-Checkin" and "Time Accumulation"
CREATE OR REPLACE FUNCTION public.ping_moderator()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_date_val date := CURRENT_DATE;
    user_id_val uuid := auth.uid();
BEGIN
    -- Check if attendance row exists for today
    IF EXISTS (
        SELECT 1 FROM public.moderator_attendance 
        WHERE user_id = user_id_val AND work_date = current_date_val
    ) THEN
        -- Update existing: Increment active_seconds by 60 (assuming 1 min ping)
        -- Update last_activity directly
        UPDATE public.moderator_attendance
        SET 
            active_seconds = COALESCE(active_seconds, 0) + 60,
            last_activity_at = now(),
            current_status = 'working'
        WHERE user_id = user_id_val AND work_date = current_date_val;
    ELSE
        -- Insert new record (Auto Start)
        INSERT INTO public.moderator_attendance (
            user_id, 
            work_date, 
            check_in, 
            active_seconds, 
            last_activity_at, 
            current_status
        ) VALUES (
            user_id_val, 
            current_date_val, 
            now(), 
            60, -- First minute counts
            now(), 
            'working'
        );
    END IF;
END;
$$;
