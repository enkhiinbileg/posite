import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkQPayPayment } from '@/lib/qpay';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('payment_id');

        console.info(`🔔 QPay Webhook received for payment: ${paymentId}`);

        if (!paymentId) {
            return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
        }

        // 1. Get payment record
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            console.error(`❌ Payment not found for webhook: ${paymentId}`);
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // If already completed, just return OK
        if (payment.status === 'completed') {
            console.info(`ℹ️ Payment ${paymentId} already completed.`);
            return NextResponse.json({ success: true });
        }

        // 2. Verify with QPay (CRITICAL: Post-callback check)
        console.info(`🔍 Verifying payment ${paymentId} with QPay V2...`);
        const qpayStatus = await checkQPayPayment(payment.qpay_invoice_id);

        // QPay V2: Extremely robust status check (checks rows and top-level fields)
        const isPaid = 
            qpayStatus.rows?.some((row: any) => {
                const s = (row.payment_status || row.status || row.payment_state || '').toUpperCase();
                return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED';
            }) ||
            ['PAID', 'SUCCESS', 'COMPLETED'].includes((qpayStatus.payment_status || qpayStatus.status || qpayStatus.payment_state || '').toUpperCase());

        if (isPaid) {
            console.info(`✅ Payment ${paymentId} verified as PAID. Processing via RPC...`);
            if (payment.video_id) {
                await handleVideoGrant(payment);
            } else {
                const { error: rpcError } = await supabaseAdmin.rpc('process_successful_payment', {
                    p_payment_id: payment.id,
                    p_user_id: payment.user_id,
                    p_plan_id: payment.plan_id
                });

                if (rpcError) {
                    console.error('❌ Webhook RPC Error:', rpcError);
                    // Fallback to manual grant if RPC fails
                    await handleVipGrant(payment);
                }
            }

            return NextResponse.json({ success: true });
        } else {
            console.warn(`⚠️ Payment ${paymentId} check returned: ${qpayStatus.rows?.[0]?.payment_status || 'UNKNOWN'}`);
            return NextResponse.json({ success: false, status: 'not_paid_yet' });
        }

    } catch (err: any) {
        console.error('❌ QPay Webhook Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function handleVipGrant(payment: any) {
    const { data: plan } = await supabaseAdmin
        .from('pricing_plans')
        .select('*')
        .eq('id', payment.plan_id)
        .single();

    if (!plan) throw new Error('Plan not found');

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_vip, vip_expiration, nsfw_vip_expiration')
        .eq('id', payment.user_id)
        .single();

    let newExpiration = new Date();
    const isNsfw = plan.is_nsfw === true;
    const currentExp = isNsfw ? profile?.nsfw_vip_expiration : profile?.vip_expiration;

    if (currentExp) {
        const expDate = new Date(currentExp);
        if (expDate > newExpiration) newExpiration = expDate;
    }

    if (plan.duration_unit === 'months') newExpiration.setMonth(newExpiration.getMonth() + plan.duration_value);
    else if (plan.duration_unit === 'years') newExpiration.setFullYear(newExpiration.getFullYear() + plan.duration_value);
    else if (plan.duration_unit === 'days') newExpiration.setDate(newExpiration.getDate() + plan.duration_value);

    const updateData: any = {};
    if (isNsfw) {
        updateData.nsfw_vip_expiration = newExpiration.toISOString();
        updateData.show_nsfw = true;
    } else {
        updateData.is_vip = true;
        updateData.vip_expiration = newExpiration.toISOString();
    }

    await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', payment.user_id);

    await supabaseAdmin
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', payment.id);

    // Consistency log
    let durationDays = 0;
    if (plan.duration_unit === 'days') durationDays = plan.duration_value;
    else if (plan.duration_unit === 'months') durationDays = plan.duration_value * 30;
    else if (plan.duration_unit === 'years') durationDays = plan.duration_value * 365;

    await supabaseAdmin.from('vip_grants').insert({
        user_id: payment.user_id,
        granted_by: payment.user_id,
        package_type: plan.title,
        price: payment.amount,
        duration_days: durationDays
    });
}

async function handleVideoGrant(payment: any) {
    console.info(`🎬 Granting video access for user ${payment.user_id}, video ${payment.video_id}`);

    const { data: video } = await supabaseAdmin
        .from('videos')
        .select('*')
        .eq('id', payment.video_id)
        .single();

    if (!video) throw new Error('Video not found');

    // 1. Check for existing access to handle "extension"
    const { data: existingAccess } = await supabaseAdmin
        .from('video_access')
        .select('*')
        .eq('user_id', payment.user_id)
        .eq('video_id', payment.video_id)
        .maybeSingle();

    let expiresAt: string | null = null;
    if (payment.access_type === 'rental') {
        let baseDate = new Date();

        // If there's an active rental, extend from its expiration date
        if (existingAccess?.expires_at) {
            const currentExp = new Date(existingAccess.expires_at);
            if (currentExp > baseDate) {
                baseDate = currentExp;
            }
        }

        baseDate.setHours(baseDate.getHours() + (video.rental_duration_hours || 24));
        expiresAt = baseDate.toISOString();
    }

    // 2. Upsert into video_access
    const { error: accessError } = await supabaseAdmin
        .from('video_access')
        .upsert({
            id: existingAccess?.id, // Use existing ID if found to trigger update
            user_id: payment.user_id,
            video_id: payment.video_id,
            access_type: payment.access_type,
            expires_at: expiresAt,
            payment_id: payment.id
        });

    if (accessError) throw accessError;

    // 3. Mark payment as completed
    await supabaseAdmin
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', payment.id);

    console.info(`✅ Video access granted successfully.`);
}

