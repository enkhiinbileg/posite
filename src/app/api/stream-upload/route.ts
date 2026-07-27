import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uploadLength, metadata } = body;

        const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID; // We reuse this since it's the CF account ID
        const token = process.env.CLOUDFLARE_STREAM_TOKEN;

        if (!accountId || !token) {
            return NextResponse.json({ error: 'Missing Cloudflare credentials' }, { status: 500 });
        }

        if (!uploadLength) {
            return NextResponse.json({ error: 'Missing uploadLength' }, { status: 400 });
        }

        // Generate TUS Direct Upload URL
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Length': uploadLength.toString(),
                'Upload-Metadata': metadata || '' // optional base64 encoded metadata
            }
        });

        if (response.status !== 201) {
            const errorText = await response.text();
            console.error('Cloudflare TUS Error:', errorText);
            return NextResponse.json({ error: 'Failed to create Cloudflare upload URL' }, { status: 500 });
        }

        // The Location header contains the one-time TUS upload URL
        const location = response.headers.get('Location');
        // The stream-media-id header contains the Cloudflare Video ID (uid)
        const streamMediaId = response.headers.get('stream-media-id');

        if (!location) {
            return NextResponse.json({ error: 'No Location header returned from Cloudflare' }, { status: 500 });
        }

        return NextResponse.json({
            uploadUrl: location,
            uid: streamMediaId
        });

    } catch (error: any) {
        console.error('Stream upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
