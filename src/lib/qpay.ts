/**
 * QPay V2 API Utility with Token Caching
 * Updated: 2026-05-11 (Force Deploy)
 */

const QPAY_BASE_URL = process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2';
const QPAY_CLIENT_ID = process.env.QPAY_CLIENT_ID;
const QPAY_CLIENT_SECRET = process.env.QPAY_CLIENT_SECRET;
const QPAY_INVOICE_CODE = process.env.QPAY_INVOICE_CODE;

interface QPayTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    refresh_token: string;
}

interface QPayInvoiceResponse {
    invoice_id: string;
    qr_text: string;
    qr_image: string;
    qpay_short_url: string;
    urls: {
        name: string;
        description: string;
        logo: string;
        link: string;
    }[];
}

// Token Cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0; // Timestamp in ms

export async function getQPayAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Check if cached token exists and is still valid (with 30s buffer)
    if (cachedToken && tokenExpiry > now + 30000) {
        console.info('🎟️ Using cached QPay token');
        return cachedToken;
    }

    if (!QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET) {
        throw new Error('QPay credentials not configured');
    }

    console.info('🔑 Requesting new QPay token...');
    const auth = Buffer.from(`${QPAY_CLIENT_ID}:${QPAY_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${QPAY_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`QPay Auth Failed: ${error}`);
    }

    const data: QPayTokenResponse = await response.json();
    
    // Update Cache
    cachedToken = data.access_token;
    // expires_in is usually in seconds
    tokenExpiry = now + (data.expires_in * 1000);
    
    console.info(`✅ New QPay token acquired. Expires in ${data.expires_in}s`);
    return data.access_token;
}

export async function createQPayInvoice(params: {
    sender_invoice_no: string;
    amount: number;
    description: string;
    callback_url: string;
}): Promise<QPayInvoiceResponse> {
    const token = await getQPayAccessToken();

    const response = await fetch(`${QPAY_BASE_URL}/invoice`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            invoice_code: QPAY_INVOICE_CODE,
            sender_invoice_no: params.sender_invoice_no,
            invoice_receiver_code: 'terminal',
            invoice_description: params.description,
            amount: params.amount,
            callback_url: params.callback_url
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`QPay Invoice Creation Failed: ${error}`);
    }

    return await response.json();
}

export async function checkQPayPayment(objectId: string, objectType: "INVOICE" | "PAYMENT" = "INVOICE"): Promise<any> {
    const token = await getQPayAccessToken();
    
    try {
        const response = await fetch(`${QPAY_BASE_URL}/payment/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                object_type: objectType,
                object_id: objectId
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`QPay Payment Check Failed: ${error}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('QPay Check Error:', error);
        throw error;
    }
}
