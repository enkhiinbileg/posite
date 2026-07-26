-- 🚀 Run this in your Supabase SQL Editor to fix QPay V2 Integration --

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    qpay_invoice_id TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own payments') THEN
        CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all payments') THEN
        CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. RPC Function: process_successful_payment
-- This function handles granting VIP status atomically
CREATE OR REPLACE FUNCTION public.process_successful_payment(
    p_payment_id UUID,
    p_plan_id TEXT,
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_plan RECORD;
    v_profile RECORD;
    v_new_expiration TIMESTAMPTZ;
    v_is_nsfw BOOLEAN;
    v_duration_days INTEGER;
BEGIN
    -- A. Get Plan Info (Robust lookup for UUID and friendly IDs)
    SELECT * INTO v_plan FROM pricing_plans 
    WHERE id::text = p_plan_id 
       OR (p_plan_id = 'monthly' AND (title ILIKE '%1 Сар%' OR duration_value = 1))
       OR (p_plan_id = 'quarterly' AND (title ILIKE '%3 Сар%' OR duration_value = 3))
       OR (p_plan_id = 'annually' AND (title ILIKE '%1 Жил%' OR duration_value = 12 OR (duration_value = 1 AND duration_unit = 'years')))
       OR (p_plan_id = 'nsfw_monthly' AND (title ILIKE '%18+%' OR is_nsfw = TRUE))
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan not found for ID: %', p_plan_id;
    END IF;

    -- B. Get Profile Info
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    v_is_nsfw := COALESCE(v_plan.is_nsfw, FALSE);

    -- C. Calculate New Expiration (Robust Stacking)
    -- GREATEST(NOW(), COALESCE(expiration, NOW())) ensures we start from the future date or NOW()
    IF v_is_nsfw THEN
        v_new_expiration := GREATEST(NOW(), COALESCE(v_profile.nsfw_vip_expiration, NOW()));
    ELSE
        v_new_expiration := GREATEST(NOW(), COALESCE(v_profile.vip_expiration, NOW()));
    END IF;

    -- D. Add Duration based on plan settings
    IF v_plan.duration_unit = 'months' THEN
        v_new_expiration := v_new_expiration + (v_plan.duration_value || ' months')::INTERVAL;
        v_duration_days := v_plan.duration_value * 30;
    ELSIF v_plan.duration_unit = 'years' THEN
        v_new_expiration := v_new_expiration + (v_plan.duration_value || ' years')::INTERVAL;
        v_duration_days := v_plan.duration_value * 365;
    ELSIF v_plan.duration_unit = 'days' THEN
        v_new_expiration := v_new_expiration + (v_plan.duration_value || ' days')::INTERVAL;
        v_duration_days := v_plan.duration_value;
    ELSE
        -- Default fallback if unit is unknown
        v_new_expiration := v_new_expiration + INTERVAL '30 days';
        v_duration_days := 30;
    END IF;

    -- E. Update Profile VIP Status
    IF v_is_nsfw THEN
        UPDATE profiles SET 
            nsfw_vip_expiration = v_new_expiration,
            show_nsfw = TRUE
        WHERE id = p_user_id;
    ELSE
        UPDATE profiles SET 
            is_vip = TRUE,
            vip_expiration = v_new_expiration
        WHERE id = p_user_id;
    END IF;

    -- F. Update Payment Status to completed
    UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = p_payment_id;

    -- G. Log to vip_grants for auditing
    INSERT INTO vip_grants (user_id, package_type, price, duration_days, granted_by)
    VALUES (p_user_id, v_plan.title, (SELECT amount FROM payments WHERE id = p_payment_id), v_duration_days, p_user_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
