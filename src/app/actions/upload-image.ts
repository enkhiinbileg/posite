"use server";

import { uploadToR2, uploadRawToR2 } from "@/lib/r2";

export async function uploadImage(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        const bucketPath = formData.get("bucketPath") as string;
        const raw = formData.get("raw") as string; // true or false

        if (!file) throw new Error("No file provided");
        if (!bucketPath) throw new Error("No bucket path provided");

        const arrayBuffer = await file.arrayBuffer();

        // Generate a clean path: {bucketPath}/timestamp-random.ext
        const fileExt = file.name.split('.').pop() || 'jpg';
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
        const fileName = `${Date.now()}-${cleanFileName}`;

        const cleanBucketPath = bucketPath.replace(/^\/|\/$/g, '');
        const filePath = `${cleanBucketPath}/${fileName}`;

        let result;
        if (raw === 'true') {
            result = await uploadRawToR2(arrayBuffer, filePath, file.type);
        } else {
            result = await uploadToR2(arrayBuffer, filePath, file.type);
        }

        if (!result.success) throw new Error(result.error);

        return { success: true, url: result.url };
    } catch (error: any) {
        console.error("Image Upload Error:", error);
        return { success: false, error: error.message };
    }
}
