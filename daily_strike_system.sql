-- Daily Strike System Migration

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_strike int DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_strike int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_strike_at timestamptz,
ADD COLUMN IF NOT EXISTS strike_freezes int DEFAULT 0;

-- 2. New Table for Activity Logging (World-Class Calendar)
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date date NOT NULL,
    activity_type text NOT NULL, -- 'strike', 'freeze', 'login'
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, activity_date)
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own activity" ON public.user_activity_log FOR SELECT USING (auth.uid() = user_id);

-- 3. Function to update strike with Freeze Logic and Logging
CREATE OR REPLACE FUNCTION public.handle_daily_strike(u_id uuid)
RETURNS void AS $$
DECLARE
    last_strike timestamptz;
    today_date date;
    last_strike_date date;
    current_val int;
    freeze_count int;
BEGIN
    -- Get current strike data
    SELECT last_strike_at, current_strike, strike_freezes 
    INTO last_strike, current_val, freeze_count
    FROM public.profiles 
    WHERE id = u_id;
    
    -- Calculate dates in Ulaanbaatar timezone
    today_date := (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date;
    
    IF last_strike IS NOT NULL THEN
        last_strike_date := (last_strike AT TIME ZONE 'Asia/Ulaanbaatar')::date;
    ELSE
        last_strike_date := NULL;
    END IF;

    IF last_strike_date IS NULL THEN
        -- First time strike
        UPDATE public.profiles 
        SET current_strike = 1, 
            longest_strike = GREATEST(longest_strike, 1),
            last_strike_at = now()
        WHERE id = u_id;
        
        -- Log activity
        INSERT INTO public.user_activity_log (user_id, activity_date, activity_type)
        VALUES (u_id, today_date, 'strike')
        ON CONFLICT (user_id, activity_date) DO NOTHING;
        
    ELSIF last_strike_date = today_date THEN
        -- Already updated today, but just make sure we have a log
        INSERT INTO public.user_activity_log (user_id, activity_date, activity_type)
        VALUES (u_id, today_date, 'strike')
        ON CONFLICT (user_id, activity_date) DO NOTHING;
        RETURN;
        
    ELSIF last_strike_date = today_date - 1 THEN
        -- Consecutive day
        UPDATE public.profiles 
        SET current_strike = current_strike + 1, 
            longest_strike = GREATEST(longest_strike, current_strike + 1),
            last_strike_at = now()
        WHERE id = u_id;
        
        -- Log activity
        INSERT INTO public.user_activity_log (user_id, activity_date, activity_type)
        VALUES (u_id, today_date, 'strike')
        ON CONFLICT (user_id, activity_date) DO NOTHING;
        
        -- Reward: Give 1 Freeze every 7 days (max 3 freezes)
        IF (current_val + 1) % 7 = 0 THEN
            UPDATE public.profiles 
            SET strike_freezes = LEAST(COALESCE(strike_freezes, 0) + 1, 3)
            WHERE id = u_id;
        END IF;

    ELSE
        -- Strike broken (more than 1 day skipped)
        -- CHECK FOR FREEZE
        IF freeze_count > 0 THEN
            -- Use a freeze! Keep the strike count
            UPDATE public.profiles 
            SET strike_freezes = strike_freezes - 1,
                last_strike_at = now() -- Keep it alive
            WHERE id = u_id;
            
            -- Log activity as freeze
            INSERT INTO public.user_activity_log (user_id, activity_date, activity_type)
            VALUES (u_id, today_date, 'freeze')
            ON CONFLICT (user_id, activity_date) DO NOTHING;
        ELSE
            -- No freeze left, reset
            UPDATE public.profiles 
            SET current_strike = 1, 
                last_strike_at = now()
            WHERE id = u_id;
            
            -- Log activity
            INSERT INTO public.user_activity_log (user_id, activity_date, activity_type)
            VALUES (u_id, today_date, 'strike')
            ON CONFLICT (user_id, activity_date) DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expose to RPC for manual check-in from Navbar
CREATE OR REPLACE FUNCTION public.check_in_strike()
RETURNS void AS $$
BEGIN
    PERFORM public.handle_daily_strike(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger Function for Reading Progress
CREATE OR REPLACE FUNCTION public.on_reading_activity_strike()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.handle_daily_strike(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Trigger to reading_progress
DROP TRIGGER IF EXISTS tr_reading_strike ON public.reading_progress;
CREATE TRIGGER tr_reading_strike
    AFTER INSERT OR UPDATE ON public.reading_progress
    FOR EACH ROW EXECUTE PROCEDURE public.on_reading_activity_strike();

-- 5. Trigger on Profile Update (Login/Entry Integration)
CREATE OR REPLACE FUNCTION public.on_profile_activity_strike()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update strike if last_seen has changed (prevents loops)
    IF (OLD.last_seen IS DISTINCT FROM NEW.last_seen) THEN
        PERFORM public.handle_daily_strike(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_profile_strike ON public.profiles;
CREATE TRIGGER tr_profile_strike
    AFTER UPDATE OF last_seen ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.on_profile_activity_strike();
