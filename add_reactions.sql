ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Add update policy for admins to chat_messages if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' AND policyname = 'Admins can update all messages'
    ) THEN
        CREATE POLICY "Admins can update all messages" 
        ON public.chat_messages FOR UPDATE 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
    END IF;
END $$;
