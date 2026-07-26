
-- Run this in Supabase SQL Editor
-- This script assigns chapters to a specific Translator by their EMAIL.

DO $$
DECLARE
    target_email TEXT := 'YOUR_TRANSLATOR_EMAIL@GMAIL.COM'; -- <--- ЭНД ИМЭЙЛЭЭ БИЧНЭ ҮҮ
    target_user_id UUID;
BEGIN
    -- 1. Find the User ID for this email
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User found not found for email: %', target_email;
    ELSE
        RAISE NOTICE 'Found User ID: %', target_user_id;

        -- 2. Update orphaned chapters OR chapters wrongly assigned to Admin
        UPDATE chapters 
        SET translator_id = target_user_id
        WHERE translator_id IS NULL; -- Assign orphaned ones
        
        -- Uncomment below if you ran the previous script and it assigned to the wrong person:
        -- OR translator_id = auth.uid(); 

        RAISE NOTICE 'Updated chapters to Translator ID: %', target_user_id;
    END IF;
END $$;
