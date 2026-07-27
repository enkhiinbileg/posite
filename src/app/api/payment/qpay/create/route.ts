import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createQPayInvoice } from '@/lib/qpay';

export async function POST(request: Request) {
    try {
        const { planId, videoId, accessType, amount, userId, description } = await request.json();

        if ((!planId && !videoId) || !amount || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.info(`🆕 Creating QPay Invoice for user: ${userId}, plan: ${planId}, video: ${videoId}, amount: ${amount}`);

        let payment: any = null;

        // 1. Try to create a pending payment record in DB
        try {
            const { data: dbPayment, error: dbError } = await supabaseAdmin
                .from('payments')
                .insert([{
                    user_id: userId,
                    plan_id: planId || null,
                    video_id: videoId || null,
                    access_type: accessType || null,
                    amount: amount,
                    status: 'pending'
                }])
                .select()
                .single();

            if (!dbError && dbPayment) {
                payment = dbPayment;
            }
        } catch (e) {
            console.warn('⚠️ Payments table insert failed:', e);
        }

        // Fallback payment object if DB table missing
        if (!payment) {
            payment = {
                id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                user_id: userId,
                plan_id: planId || null,
                video_id: videoId || null,
                access_type: accessType || null,
                amount: amount,
                status: 'pending'
            };
        }

        // 2. Create QPay Invoice
        const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/payment/qpay/webhook?payment_id=${payment.id}`;
        
        try {
            console.info(`📡 Calling QPay API to create invoice for payment: ${payment.id}`);
            const qpayInvoice = await createQPayInvoice({
                sender_invoice_no: payment.id,
                amount: amount,
                description: description || `PM ${userId}`,
                callback_url: callbackUrl
            });

            // 3. Update payment record if DB available
            try {
                await supabaseAdmin
                    .from('payments')
                    .update({ qpay_invoice_id: qpayInvoice.invoice_id })
                    .eq('id', payment.id);
            } catch (e) {
                // Ignore DB error
            }

            console.info(`✅ QPay Invoice created: ${qpayInvoice.invoice_id}`);

            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                invoice_id: qpayInvoice.invoice_id,
                invoiceId: qpayInvoice.invoice_id,
                qrText: qpayInvoice.qr_text,
                qrImage: qpayInvoice.qr_image,
                qr_image: qpayInvoice.qr_image,
                urls: qpayInvoice.urls
            });
        } catch (qpayError: any) {
            console.error('❌ QPay Invoice creation failed:', qpayError);
            return NextResponse.json({ error: 'QPay integration failed: ' + (qpayError.message || 'Error') }, { status: 500 });
        }

    } catch (err: any) {
        console.error('❌ Unexpected error in QPay create route:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
