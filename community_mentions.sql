-- Community Mentions & Notifications Logic

-- 1. Create a function to handle @everyone mentions
CREATE OR REPLACE FUNCTION public.handle_community_mention()
RETURNS TRIGGER AS $$
DECLARE
    mention_sender_name TEXT;
    target_user RECORD;
    channel_name TEXT;
BEGIN
    -- Check if the message contains @everyone (case-insensitive)
    IF NEW.content ILIKE '%@everyone%' THEN
        
        -- Get sender's name
        SELECT full_name INTO mention_sender_name 
        FROM public.profiles 
        WHERE id = NEW.user_id;

        -- Get channel name
        SELECT name INTO channel_name 
        FROM public.community_channels 
        WHERE id = NEW.channel_id;

        -- Insert notifications for all active users except the sender
        -- We limit to users who have a record in profiles to avoid ghost users
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            is_read,
            link,
            created_at
        )
        SELECT 
            p.id,
            mention_sender_name || ' mention everyone',
            LEFT(NEW.content, 100), -- Short snippet of the message
            'social',
            false,
            '/community?channel=' || NEW.channel_id,
            NOW()
        FROM public.profiles p
        WHERE p.id != NEW.user_id;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_community_message_mention ON public.community_messages;
CREATE TRIGGER on_community_message_mention
AFTER INSERT ON public.community_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_community_mention();

-- 3. Add check for individual mentions (Optional enhancement)
-- This logic can be expanded later to @username
