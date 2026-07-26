import * as ort from 'onnxruntime-web';
import { fetchWithProgress } from './fetchUtils';

export class ImageCleaner {
    private session: ort.InferenceSession | null = null;
    private loadPromise: Promise<void> | null = null;
    private modelUrl: string = 'https://huggingface.co/ogkalu/lama-manga-onnx-dynamic/resolve/main/lama-manga-dynamic.onnx';

    async loadModel(onProgress?: (progress: number, label: string) => void) {
        if (this.session) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                // 1. Download model with progress
                const buffer = await fetchWithProgress(this.modelUrl, (received, total) => {
                    const pct = Math.round((received / total) * 100);
                    const mb = (total / (1024 * 1024)).toFixed(1);
                    if (onProgress) onProgress(pct, `Цэвэрлэгч: ${pct}% (${mb}MB)`);
                });

                // 2. Create Session
                const providers = ['webgpu', 'webgl', 'cpu'];
                this.session = await ort.InferenceSession.create(buffer, {
                    executionProviders: providers,
                    graphOptimizationLevel: 'all'
                });
                console.log('✅ Image Cleaning model loaded');
            } catch (e) {
                this.loadPromise = null;
                console.error('❌ Failed to load Image Cleaning model:', e);
                throw e;
            }
        })();

        return this.loadPromise;
    }

    async clean(image: HTMLCanvasElement | HTMLImageElement, mask: HTMLCanvasElement): Promise<string> {
        if (!this.session) await this.loadModel();
        if (!this.session) throw new Error('Model not loaded');

        const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
        const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

        // LaMa dynamic model can handle varying sizes, but for stability 
        // we might want to align to 8 or use a fixed size if performance is an issue.
        // For now, we use the original size (scaling down if too large for browser RAM)
        const [imgTensor, maskTensor] = this.preprocess(image, mask);

        const feeds: Record<string, ort.Tensor> = {
            'image': imgTensor,
            'mask': maskTensor
        };

        const results = await this.session.run(feeds);
        const output = results.output.data as Float32Array;

        return this.postprocess(output, width, height);
    }

    private preprocess(image: HTMLCanvasElement | HTMLImageElement, mask: HTMLCanvasElement): [ort.Tensor, ort.Tensor] {
        const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
        const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

        // Create canvas to get image data
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Get mask data
        const maskCtx = mask.getContext('2d')!;
        const maskData = maskCtx.getImageData(0, 0, width, height).data;

        const imgFlat = new Float32Array(1 * 3 * height * width);
        const maskFlat = new Float32Array(1 * 1 * height * width);

        for (let i = 0; i < height * width; i++) {
            // Image normalized to [0, 1]
            imgFlat[i] = imgData[i * 4] / 255.0; // R
            imgFlat[i + height * width] = imgData[i * 4 + 1] / 255.0; // G
            imgFlat[i + height * width * 2] = imgData[i * 4 + 2] / 255.0; // B

            // Mask normalized (0 or 1)
            // Usually text is white (255) on black (0) in our mask
            maskFlat[i] = maskData[i * 4] > 128 ? 1.0 : 0.0;
        }

        return [
            new ort.Tensor('float32', imgFlat, [1, 3, height, width]),
            new ort.Tensor('float32', maskFlat, [1, 1, height, width])
        ];
    }

    private postprocess(data: Float32Array, width: number, height: number): string {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const imgData = ctx.createImageData(width, height);

        for (let i = 0; i < height * width; i++) {
            imgData.data[i * 4] = Math.min(255, Math.max(0, data[i] * 255));
            imgData.data[i * 4 + 1] = Math.min(255, Math.max(0, data[i + height * width] * 255));
            imgData.data[i * 4 + 2] = Math.min(255, Math.max(0, data[i + height * width * 2] * 255));
            imgData.data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/png');
    }
}
