"use server";

import { AwsClient } from "aws4fetch";

// Only accessible on Server-side
const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
const accessKeyId = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const aws = new AwsClient({
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    region: "auto",
    service: "s3"
});

/**
 * Helper to normalize file data and calculate Content-Length
 */
function prepareBodyAndLength(fileData: any): { body: any; contentLength: number } {
    if (!fileData) {
        return { body: null, contentLength: 0 };
    }

    // Handle next.js serialization of Buffers
    if (fileData.type === "Buffer" && Array.isArray(fileData.data)) {
        const buf = Buffer.from(fileData.data);
        return { body: buf, contentLength: buf.length };
    }

    // If it's a Node.js Buffer
    if (Buffer.isBuffer(fileData)) {
        return { body: fileData, contentLength: fileData.length };
    }

    // If it's an ArrayBuffer
    if (fileData instanceof ArrayBuffer) {
        return { body: fileData, contentLength: fileData.byteLength };
    }

    // If it's a TypedArray (like Uint8Array)
    if (ArrayBuffer.isView(fileData)) {
        return { body: fileData, contentLength: fileData.byteLength };
    }

    // Fallback: try to convert to Buffer
    try {
        const buf = Buffer.from(fileData);
        return { body: buf, contentLength: buf.length };
    } catch (e) {
        const length = typeof fileData.byteLength === "number" ? fileData.byteLength : (typeof fileData.length === "number" ? fileData.length : 0);
        return { body: fileData, contentLength: length };
    }
}

/**
 * Server Action for secure uploads to R2 with WebP Optimization (handled client-side)
 */
export async function uploadToR2(fileData: ArrayBuffer, filePath: string, contentType: string) {
    try {
        const webpPath = filePath.replace(/\.[^/.]+$/, "") + ".webp";
        const endpointUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${webpPath}`);

        const { body, contentLength } = prepareBodyAndLength(fileData);

        const response = await aws.fetch(endpointUrl, {
            method: "PUT",
            body: body,
            headers: {
                "Content-Type": "image/webp",
                "Content-Length": String(contentLength),
            }
        });

        if (!response.ok) {
            throw new Error(`R2 Upload Failed: ${response.status} ${response.statusText}`);
        }

        const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        return { url: `${baseUrl}/${webpPath}`, success: true };
    } catch (error: any) {
        console.error("R2 Upload Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for secure RAW uploads to R2 (e.g. Fonts)
 */
export async function uploadRawToR2(fileData: ArrayBuffer, filePath: string, contentType: string) {
    try {
        const endpointUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${filePath}`);
        
        const { body, contentLength } = prepareBodyAndLength(fileData);

        const response = await aws.fetch(endpointUrl, {
            method: "PUT",
            body: body,
            headers: {
                "Content-Type": contentType,
                "Content-Length": String(contentLength),
            }
        });

        if (!response.ok) {
            throw new Error(`R2 Raw Upload Failed: ${response.status} ${response.statusText}`);
        }

        const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        return { url: `${baseUrl}/${filePath}`, success: true };
    } catch (error: any) {
        console.error("R2 Raw Upload Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getPresignedUrl(filePath: string, contentType: string) {
    try {
        const endpointUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${filePath}`);
        
        const signed = await aws.sign(endpointUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType
            },
            aws: { signQuery: true }
        });

        const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        return { url: signed.url, success: true, publicUrl: `${baseUrl}/${filePath}` };
    } catch (error: any) {
        console.error("Presigned URL Error:", error);
        return { success: false, error: error.message };
    }
}
