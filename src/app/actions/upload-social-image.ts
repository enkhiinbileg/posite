"use server";

import { uploadToR2 } from "@/lib/r2";

export async function uploadSocialImage(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file provided");

        const arrayBuffer = await file.arrayBuffer();

        // Generate a clean path: social/timestamp-random.ext
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `social/${fileName}`;

        const result = await uploadToR2(arrayBuffer, filePath, file.type);

        if (!result.success) throw new Error(result.error);

        return { success: true, url: result.url };
    } catch (error: any) {
        console.error("Social Image Upload Error:", error);
        return { success: false, error: error.message };
    }
}
