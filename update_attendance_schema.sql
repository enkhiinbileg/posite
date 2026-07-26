-- Add columns for Smart Attendance
ALTER TABLE public.moderator_attendance 
ADD COLUMN IF NOT EXISTS current_status text DEFAULT 'working' CHECK (current_status IN ('working', 'break', 'completed')),
ADD COLUMN IF NOT EXISTS breaks jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- Create a function to calculate real worked hours (excluding breaks)
-- This allows us to keep total_hours accurate even with breaks
CREATE OR REPLACE FUNCTION calculate_att_hours(att_id uuid)
RETURNS numeric AS $$
DECLARE
    att_record record;
    total_ms numeric := 0;
    break_ms numeric := 0;
    b jsonb;
    start_time timestamptz;
    end_time timestamptz;
BEGIN
    SELECT * INTO att_record FROM public.moderator_attendance WHERE id = att_id;
    
    IF att_record.check_out IS NULL THEN
        RETURN 0;
    END IF;

    -- Total duration from in to out
    total_ms := EXTRACT(EPOCH FROM (att_record.check_out - att_record.check_in)) * 1000;

    -- Sum up breaks
    FOR b IN SELECT * FROM jsonb_array_elements(att_record.breaks)
    LOOP
        start_time := (b->>'start')::timestamptz;
        end_time := (b->>'end')::timestamptz;
        
        IF start_time IS NOT NULL AND end_time IS NOT NULL THEN
            break_ms := break_ms + (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000);
        END IF;
    END LOOP;

    RETURN ROUND(((total_ms - break_ms) / (1000 * 60 * 60))::numeric, 2);
END;
$$ LANGUAGE plpgsql;
