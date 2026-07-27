"use server";

import { AwsClient } from "aws4fetch";

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

/**
 * Helper to normalize file data and calculate Content-Length
 */
function prepareBodyAndLength(fileData: any): { body: any; contentLength: number } {
    if (!fileData) {
        return { body: null, contentLength: 0 };
    }

    if (fileData.type === "Buffer" && Array.isArray(fileData.data)) {
        const buf = Buffer.from(fileData.data);
        return { body: buf, contentLength: buf.length };
    }

    if (Buffer.isBuffer(fileData)) {
        return { body: fileData, contentLength: fileData.length };
    }

    if (fileData instanceof ArrayBuffer) {
        return { body: fileData, contentLength: fileData.byteLength };
    }

    if (ArrayBuffer.isView(fileData)) {
        return { body: fileData, contentLength: fileData.byteLength };
    }

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
        const { aws, accountId, R2_BUCKET_NAME, R2_PUBLIC_URL } = getR2Config();
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
        const { aws, accountId, R2_BUCKET_NAME, R2_PUBLIC_URL } = getR2Config();
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

export async function getPresignedUrl(filePath: string, contentType?: string) {
    try {
        const { aws, accountId, R2_BUCKET_NAME, R2_PUBLIC_URL } = getR2Config();
        const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        const endpointUrl = new URL(`https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${filePath}`);
        
        const signed = await aws.sign(endpointUrl, {
            method: 'PUT',
            aws: { signQuery: true }
        });

        return { url: signed.url, success: true, publicUrl: `${baseUrl}/${filePath}` };
    } catch (error: any) {
        console.error("Presigned URL Error:", error);
        return { success: false, error: error.message };
    }
}
