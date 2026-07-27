import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkQPayPayment } from '@/lib/qpay';

export async function POST(request: Request) {
    try {
        const { paymentId, invoiceId } = await request.json();

        if (!paymentId && !invoiceId) {
            return NextResponse.json({ error: 'Missing paymentId or invoiceId' }, { status: 400 });
        }

        let payment: any = null;

        // 1. Try to get payment record from DB
        try {
            const { data, error } = await supabaseAdmin
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .single();

            if (!error && data) {
                payment = data;
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch payment from DB:', e);
        }

        // Fallback payment object
        if (!payment) {
            payment = {
                id: paymentId || `pay_${Date.now()}`,
                qpay_invoice_id: invoiceId,
                status: 'pending'
            };
        }

        const targetInvoiceId = invoiceId || payment.qpay_invoice_id || paymentId;

        // 2. Check with QPay
        console.info(`🔍 Checking payment status via QPay V2 for invoice: ${targetInvoiceId}...`);
        let qpayStatus: any = null;
        try {
            qpayStatus = await checkQPayPayment(targetInvoiceId);
        } catch (err: any) {
            console.error('QPay API check error:', err);
            return NextResponse.json({ paid: false, status: 'pending' });
        }
        
        const checkIsPaid = (status: any) => {
            if (!status) return false;
            return status.rows?.some((row: any) => {
                const s = (row.payment_status || row.status || row.payment_state || '').toUpperCase();
                return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED';
            }) ||
            ['PAID', 'SUCCESS', 'COMPLETED'].includes((status.payment_status || status.status || status.payment_state || '').toUpperCase());
        };

        const isPaid = checkIsPaid(qpayStatus);

        if (isPaid) {
            console.info(`✅ Payment verified as PAID.`);
            return NextResponse.json({ paid: true, success: true, status: 'completed' });
        }

        return NextResponse.json({ paid: false, success: false, status: 'pending' });

    } catch (err: any) {
        console.error('❌ QPay Check Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
