import imageCompression from 'browser-image-compression';

export async function compressImage(file: File) {
    const options = {
        maxSizeMB: 2, // 2MB is plenty for WebP, even for long strips
        maxWidthOrHeight: 20000,
        useWebWorker: true,
        initialQuality: 0.85,
        fileType: 'image/webp' as const // Enforce WebP conversion
    };

    try {
        const compressedFile = await imageCompression(file, options);
        // Ensure name ends with .webp
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newName = `${baseName}.webp`;

        return new File([compressedFile], newName, {
            type: 'image/webp',
            lastModified: Date.now(),
        });
    } catch (error) {
        console.error("Compression error:", error);
        return file;
    }
}
