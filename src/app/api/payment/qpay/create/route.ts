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

        // 1. Create a pending payment record in our database
        const { data: payment, error: dbError } = await supabaseAdmin
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

        if (dbError) {
            console.error('❌ Database error creating payment:', dbError);
            return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
        }

        // 2. Create QPay Invoice
        const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/qpay/webhook?payment_id=${payment.id}`;
        
        try {
            console.info(`📡 Calling QPay API to create invoice for payment: ${payment.id}`);
            const qpayInvoice = await createQPayInvoice({
                sender_invoice_no: payment.id,
                amount: amount,
                description: description || `PM ${userId}`,
                callback_url: callbackUrl
            });

            // 3. Update payment record with QPay Invoice ID
            await supabaseAdmin
                .from('payments')
                .update({ qpay_invoice_id: qpayInvoice.invoice_id })
                .eq('id', payment.id);

            console.info(`✅ QPay Invoice created: ${qpayInvoice.invoice_id}`);

            return NextResponse.json({
                success: true,
                paymentId: payment.id,
                invoiceId: qpayInvoice.invoice_id,
                qrText: qpayInvoice.qr_text,
                qrImage: qpayInvoice.qr_image,
                urls: qpayInvoice.urls
            });
        } catch (qpayError: any) {
            console.error('❌ QPay Invoice creation failed:', qpayError);
            // Mark payment as failed in DB
            await supabaseAdmin
                .from('payments')
                .update({ status: 'failed' })
                .eq('id', payment.id);

            return NextResponse.json({ error: 'QPay integration failed: ' + qpayError.message }, { status: 500 });
        }

    } catch (err: any) {
        console.error('❌ Unexpected error in QPay create route:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
