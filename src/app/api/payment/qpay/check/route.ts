import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkQPayPayment } from '@/lib/qpay';

export async function POST(request: Request) {
    try {
        const { paymentId } = await request.json();

        if (!paymentId) {
            return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
        }

        // 1. Get payment record
        // 1. Get payment record
        const { data: payment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            console.error(`❌ Payment not found for check: ${paymentId}`);
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (payment.status === 'completed') {
            console.info(`ℹ️ Payment ${paymentId} already completed.`);
            return NextResponse.json({ 
                success: true, 
                status: 'completed',
                videoId: payment.video_id,
                message: payment.video_id ? 'Video access granted' : 'VIP Plan granted'
            });
        }

        if (!payment.qpay_invoice_id) {
            return NextResponse.json({ error: 'No invoice ID associated with this payment' }, { status: 400 });
        }

        // 2. Check with QPay (Double Check Strategy)
        console.info(`🔍 Checking payment ${paymentId} status via QPay V2...`);
        let qpayStatus = await checkQPayPayment(payment.qpay_invoice_id);
        
        const checkIsPaid = (status: any) => {
            return status.rows?.some((row: any) => {
                const s = (row.payment_status || row.status || row.payment_state || '').toUpperCase();
                return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED';
            }) ||
            ['PAID', 'SUCCESS', 'COMPLETED'].includes((status.payment_status || status.status || status.payment_state || '').toUpperCase());
        };

        if (!checkIsPaid(qpayStatus)) {
            console.info(`⚠️ First check not PAID. Trying fallback check with payment.id ${payment.id}...`);
            try {
                const fallbackStatus = await checkQPayPayment(payment.id);
                if (checkIsPaid(fallbackStatus)) {
                    console.info(`✅ Fallback check confirmed payment!`);
                    qpayStatus = fallbackStatus;
                }
            } catch (e) {
                console.warn(`Fallback check failed:`, e);
            }
        }

        const isPaid = checkIsPaid(qpayStatus);

        if (isPaid) {
            console.info(`✅ Payment ${paymentId} verified as PAID. Struct:`, JSON.stringify(qpayStatus).slice(0, 100));
            
            if (payment.video_id) {
                console.info(`🎬 Payment is for a video rental/purchase. Granting access...`);
                await handleVideoGrant(payment);
            } else {
                // 3. Grant VIP and update payment status
                const { error: updateError } = await supabaseAdmin.rpc('process_successful_payment', {
                    p_payment_id: payment.id,
                    p_user_id: payment.user_id,
                    p_plan_id: payment.plan_id
                });

                if (updateError) {
                    console.error('❌ Process payment RPC error:', updateError);
                    // Fallback to manual update if RPC fails
                    await handleManualVipGrant(payment);
                }
            }

            return NextResponse.json({ success: true, status: 'completed', videoId: payment.video_id });
        }

        const currentStatus = qpayStatus.rows?.[0]?.payment_status || qpayStatus.payment_status || 'PENDING';
        console.info(`ℹ️ Status: ${currentStatus} | VID: ${payment.video_id} | PID: ${paymentId.slice(0, 8)}`);
        return NextResponse.json({ 
            success: false, 
            status: 'pending', 
            currentStatus,
            debug: `V:${payment.video_id ? 'Y' : 'N'}_S:${currentStatus.slice(0, 4)}_P:${paymentId.slice(-4)}`
        });

    } catch (err: any) {
        console.error('❌ QPay Check Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function handleManualVipGrant(payment: any) {
    // 1. Fetch plan details (Robust lookup)
    let planData: any = null;
    
    const { data: plans } = await supabaseAdmin
        .from('pricing_plans')
        .select('*');
        
    if (plans) {
        planData = plans.find((p: any) => 
            p.id === payment.plan_id || 
            (payment.plan_id === 'monthly' && (p.title?.includes('1 Сар') || p.duration_value === 1)) ||
            (payment.plan_id === 'quarterly' && (p.title?.includes('3 Сар') || p.duration_value === 3)) ||
            (payment.plan_id === 'annually' && (p.title?.includes('1 Жил') || p.duration_value === 12)) ||
            (payment.plan_id === 'nsfw_monthly' && (p.title?.includes('18+') || p.is_nsfw === true))
        );
    }

    if (!planData) {
        throw new Error(`Plan not found for ID: ${payment.plan_id}`);
    }

    // 2. Fetch current profile
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_vip, vip_expiration, nsfw_vip_expiration')
        .eq('id', payment.user_id)
        .single();

    let newExpiration = new Date();
    
    // 3. Robust Stacking: Start from future expiration or NOW
    const isNsfw = planData.is_nsfw === true;
    const currentExp = isNsfw ? profile?.nsfw_vip_expiration : profile?.vip_expiration;

    if (currentExp) {
        const expDate = new Date(currentExp);
        if (expDate > newExpiration) {
            newExpiration = expDate;
        }
    }

    // 4. Add duration
    if (planData.duration_unit === 'months') {
        newExpiration.setMonth(newExpiration.getMonth() + planData.duration_value);
    } else if (planData.duration_unit === 'years') {
        newExpiration.setFullYear(newExpiration.getFullYear() + planData.duration_value);
    } else if (planData.duration_unit === 'days') {
        newExpiration.setDate(newExpiration.getDate() + planData.duration_value);
    } else {
        newExpiration.setMonth(newExpiration.getMonth() + 1); // Default 1 month
    }

    // 5. Update Profile and Payment
    const updateData: any = {};
    if (isNsfw) {
        updateData.nsfw_vip_expiration = newExpiration.toISOString();
        updateData.show_nsfw = true;
    } else {
        updateData.is_vip = true;
        updateData.vip_expiration = newExpiration.toISOString();
    }

    console.info(`🎁 Granting VIP manually for user: ${payment.user_id} until ${newExpiration.toISOString()}`);
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', payment.user_id);

    if (profileError) throw profileError;

    await supabaseAdmin
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', payment.id);

    // 6. Log to vip_grants
    let durationDays = 30;
    if (planData.duration_unit === 'days') durationDays = planData.duration_value;
    else if (planData.duration_unit === 'months') durationDays = planData.duration_value * 30;
    else if (planData.duration_unit === 'years') durationDays = planData.duration_value * 365;

    await supabaseAdmin.from('vip_grants').insert({
        user_id: payment.user_id,
        granted_by: payment.user_id,
        package_type: planData.title,
        price: payment.amount,
        duration_days: durationDays
    });

    return NextResponse.json({ success: true, status: 'completed', videoId: payment.video_id });
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
    return NextResponse.json({ success: true, status: 'completed', videoId: payment.video_id });
}
