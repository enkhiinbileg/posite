import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uploadLength } = body;

        const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
        const token = process.env.CLOUDFLARE_STREAM_TOKEN;

        if (!accountId || !token) {
            return NextResponse.json({ error: 'Missing Cloudflare credentials' }, { status: 500 });
        }

        if (!uploadLength) {
            return NextResponse.json({ error: 'Missing uploadLength' }, { status: 400 });
        }

        // cfut_ tokens are "Creator Upload Tokens" — used directly as TUS upload URL
        // They do NOT work as Bearer API tokens
        if (token.startsWith('cfut_')) {
            return NextResponse.json({
                uploadUrl: `https://upload.videodelivery.net/tus/${token}`,
                uid: null  // UID will be captured from stream-media-id response header
            });
        }

        // Regular API Token — call Cloudflare API to generate TUS upload URL
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Length': uploadLength.toString(),
            }
        });

        if (response.status !== 201) {
            const errorText = await response.text();
            console.error('Cloudflare TUS Error:', response.status, errorText);
            return NextResponse.json({ 
                error: `Cloudflare алдаа (${response.status}): ${errorText.slice(0, 200)}` 
            }, { status: 500 });
        }

        const location = response.headers.get('Location');
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

