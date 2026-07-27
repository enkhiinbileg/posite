import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes max for Vercel if deployed there
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
    const targetUrl = request.headers.get('x-target-url');
    const contentType = request.headers.get('content-type');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    try {
        // We forward the raw stream directly to R2 using fetch.
        // This avoids memory limits and Next.js body size limits because we never buffer the body.
        const response = await fetch(targetUrl, {
            method: 'PUT',
            body: request.body,
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
            },
            // @ts-ignore - required for Node.js fetch when streaming a body
            duplex: 'half'
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('R2 Proxy Upload Error:', response.status, text);
            return NextResponse.json({ error: `R2 returned ${response.status}` }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Proxy upload exception:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
