ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS unread_count int DEFAULT 0;

-- Reset unread count to 0 when admin sends a message or opens the conversation
-- This function can be called via RPC or we can handle it in the app.

-- Adding a trigger to increment unread_count when a user (non-admin) sends a message
CREATE OR REPLACE FUNCTION public.handle_new_chat_message() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_admin = false THEN
        UPDATE public.chat_conversations 
        SET unread_count = unread_count + 1,
            updated_at = now(),
            last_message = NEW.content
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE public.chat_conversations 
        SET updated_at = now(),
            last_message = NEW.content
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_chat_message_inserted ON public.chat_messages;
CREATE TRIGGER on_chat_message_inserted
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_message();
