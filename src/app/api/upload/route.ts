import { NextRequest, NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function getR2Config() {
    const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID || "0c79d870e37dcd2ad670a834d0488d32";
    const accessKeyId = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || "3cdfddfe7e84d5a16b6a894679d4deb3";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "45e54cac33b41efb421b254f5106667de1fe586be0dec7a90f6843e5cd4b0baa";
    const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "pomongolia";
    const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-dad9aa0d399f4639bd3a5dd6f8310303.r2.dev";

    const aws = new AwsClient({
        accessKeyId,
        secretAccessKey,
        region: "auto",
        service: "s3"
    });

    return { aws, accountId, R2_BUCKET_NAME, R2_PUBLIC_URL };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'video';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        const { aws, accountId, R2_BUCKET_NAME, R2_PUBLIC_URL } = getR2Config();

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const folder = type === 'thumbnail' ? 'thumbnails' : 'videos';
        const filePath = `${folder}/${timestamp}-${safeName}`;

        const endpointUrl = new URL(
            `https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${filePath}`
        );

        const fileBuffer = await file.arrayBuffer();

        const response = await aws.fetch(endpointUrl.toString(), {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': file.type || (type === 'thumbnail' ? 'image/jpeg' : 'video/mp4'),
                'Content-Length': String(fileBuffer.byteLength),
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('R2 upload error:', response.status, errText);
            return NextResponse.json(
                { success: false, error: `R2 upload failed: ${response.status}` },
                { status: 500 }
            );
        }

        const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        const publicUrl = `${base}/${filePath}`;

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (error: any) {
        console.error('Upload route error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
