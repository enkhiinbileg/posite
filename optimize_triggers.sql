-- Optimize Reading Strike Trigger
-- Only trigger Daily Strike check when a chapter is FINISHED, not just started/opened.
CREATE OR REPLACE FUNCTION public.on_reading_activity_strike()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if user actually FINISHED the chapter
    IF (NEW.is_finished = true AND (OLD.is_finished = false OR OLD.is_finished IS NULL)) THEN
        PERFORM public.handle_daily_strike(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Drop the trigger if we want to be even stricter, 
-- but keeping it on finish is a good balance for engagement.
