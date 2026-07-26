import * as ort from 'onnxruntime-web';
import { fetchWithProgress } from './fetchUtils';

export interface Box {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number;
    label: number;
}

export class BubbleDetector {
    private session: ort.InferenceSession | null = null;
    private loadPromise: Promise<void> | null = null;
    private confidenceThreshold: number = 0.3;
    private modelUrl: string = 'https://huggingface.co/ogkalu/comic-text-and-bubble-detector/resolve/main/detector.onnx';

    async loadModel(onProgress?: (progress: number, label: string) => void) {
        if (this.session) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                // 1. Download model with progress
                const buffer = await fetchWithProgress(this.modelUrl, (received, total) => {
                    const pct = Math.round((received / total) * 100);
                    const mb = (total / (1024 * 1024)).toFixed(1);
                    if (onProgress) onProgress(pct, `Илрүүлэгч: ${pct}% (${mb}MB)`);
                });

                // 2. Create Session
                const providers = ['webgpu', 'webgl', 'cpu'];
                this.session = await ort.InferenceSession.create(buffer, {
                    executionProviders: providers,
                    graphOptimizationLevel: 'all'
                });
                console.log('✅ Bubble Detection model loaded');
            } catch (e) {
                this.loadPromise = null;
                console.error('❌ Failed to load Bubble Detection model:', e);
                throw e;
            }
        })();

        return this.loadPromise;
    }

    async detect(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<Box[]> {
        if (!this.session) await this.loadModel();
        if (!this.session) return [];

        const [input, scaleX, scaleY] = this.preprocess(imageElement);

        // Prepare inputs as required by detector.onnx (RT-DETR)
        // input: [1, 3, 640, 640]
        // orig_target_sizes: [1, 2] -> [width, height]
        const width = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth : imageElement.width;
        const height = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight : imageElement.height;

        const origSize = new BigInt64Array([BigInt(width), BigInt(height)]);
        const feeds: Record<string, ort.Tensor> = {
            'images': input,
            'orig_target_sizes': new ort.Tensor('int64', origSize, [1, 2])
        };

        const results = await this.session.run(feeds);

        // Expected outputs: labels [1, num_boxes], boxes [1, num_boxes, 4], scores [1, num_boxes]
        const labels = results.labels.data as BigInt64Array;
        const boxes = results.boxes.data as Float32Array;
        const scores = results.scores.data as Float32Array;

        const detectedBoxes: Box[] = [];
        const numBoxes = scores.length;

        for (let i = 0; i < numBoxes; i++) {
            const score = scores[i];
            if (score < this.confidenceThreshold) continue;

            const label = Number(labels[i]);
            const baseIdx = i * 4;

            // RT-DETR usually returns absolute coordinates [x1, y1, x2, y2] 
            // because we provide orig_target_sizes
            detectedBoxes.push({
                x1: boxes[baseIdx],
                y1: boxes[baseIdx + 1],
                x2: boxes[baseIdx + 2],
                y2: boxes[baseIdx + 3],
                score,
                label
            });
        }

        return detectedBoxes;
    }

    private preprocess(image: HTMLImageElement | HTMLCanvasElement): [ort.Tensor, number, number] {
        const targetSize = 640;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d')!;

        ctx.drawImage(image, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const { data } = imageData;

        const input = new Float32Array(targetSize * targetSize * 3);
        for (let i = 0; i < targetSize * targetSize; i++) {
            input[i] = data[i * 4] / 255.0; // R
            input[i + targetSize * targetSize] = data[i * 4 + 1] / 255.0; // G
            input[i + targetSize * targetSize * 2] = data[i * 4 + 2] / 255.0; // B
        }

        const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
        const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

        return [
            new ort.Tensor('float32', input, [1, 3, targetSize, targetSize]),
            width / targetSize,
            height / targetSize
        ];
    }
}
