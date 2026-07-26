import JSZip from 'jszip';
import { decode } from '@msgpack/msgpack';

export interface CTPRImportResult {
    textObjects: any[];
    eraserObjects: any[];
    images: Record<string, string>; // filename -> dataURL
}

export async function parseCTPR(file: File): Promise<CTPRImportResult> {
    const zip = await JSZip.loadAsync(file);

    // 1. Load state.msgpack
    const msgpackFile = zip.file('state.msgpack');
    if (!msgpackFile) throw new Error('Invalid CTPR: state.msgpack not found');

    const msgpackBuffer = await msgpackFile.async('arraybuffer');
    const rootState: any = decode(new Uint8Array(msgpackBuffer));

    // --- Robust Binary Decoder ---
    const decodeNumpy = (obj: any): number[] | null => {
        if (!obj || obj.type !== 'numpy.ndarray' || !obj.data) return null;
        const data = obj.data; // Uint8Array
        const dtype = obj.dtype;

        // Use slice to get a 0-aligned ArrayBuffer if it's a view (safer for typed arrays)
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

        let arr: any;
        try {
            if (dtype === 'int32' || dtype === '<i4' || dtype === 'i4') {
                arr = new Int32Array(buffer);
            } else if (dtype === 'int64' || dtype === '<i8' || dtype === 'i8') {
                const bigArr = new BigInt64Array(buffer);
                return Array.from(bigArr).map(n => Number(n));
            } else if (dtype === 'float32' || dtype === '<f4' || dtype === 'f4') {
                arr = new Float32Array(buffer);
            } else if (dtype === 'float64' || dtype === '<f8' || dtype === 'f8') {
                arr = new Float64Array(buffer);
            } else if (dtype === 'uint8' || dtype === '|u1' || dtype === 'u1') {
                arr = new Uint8Array(buffer);
            }
        } catch (e) {
            console.error("Binary decode error:", e);
        }

        if (arr) return Array.from(arr);
        return null;
    };

    // --- Robust Unwrap Helper ---
    // The Python tool wraps many objects in { type: '...', data: ... }
    const unwrap = (obj: any): any => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        if (obj.type && obj.data !== undefined) {
            // Special case: don't unwrap numpy.ndarray if it's the target for decodeNumpy
            if (obj.type === 'numpy.ndarray' && obj.dtype) return obj;
            return unwrap(obj.data);
        }
        return obj;
    };

    // --- Robust Box Helper ---
    const getBox = (val: any): number[] | null => {
        if (!val) return null;
        if (val.type === 'numpy.ndarray') return decodeNumpy(val);
        const unwrapped = unwrap(val);
        if (Array.isArray(unwrapped)) return unwrapped;
        if (unwrapped && unwrapped.type === 'numpy.ndarray') return decodeNumpy(unwrapped);
        return null;
    };

    // --- Styling Helpers ---
    const stripHtml = (html: string): string => {
        if (!html) return '';
        // Python app often saves text as HTML in viewer_state.
        // We must remove <style> and <head> blocks entirely, as regex replacement of tags
        // leaves their content (CSS) behind.
        let text = html;
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        return text.replace(/<[^>]*>?/gm, '').trim();
    };

    const convertColor = (raw: any): string => {
        const val = unwrap(raw);
        if (!val) return '#000000';
        if (typeof val === 'string') {
            // qcolor format #AARRGGBB
            if (val.startsWith('#') && val.length === 9) {
                const aa = val.slice(1, 3);
                const rrggbb = val.slice(3);
                return `#${rrggbb}${aa}`; // #RRGGBBAA
            }
            return val;
        }
        if (Array.isArray(val)) {
            if (val.length === 3) return `rgb(${val[0]}, ${val[1]}, ${val[2]})`;
            if (val.length === 4) return `rgba(${val[0]}, ${val[1]}, ${val[2]}, ${val[3] / 255})`;
        }
        return '#000000';
    };

    const convertAlignment = (raw: any): 'left' | 'center' | 'right' => {
        const val = unwrap(raw);
        if (typeof val === 'string') {
            const l = val.toLowerCase();
            if (l.includes('left')) return 'left';
            if (l.includes('right')) return 'right';
            if (l.includes('center')) return 'center';
            return 'center';
        }
        if (typeof val === 'number') {
            // Qt.AlignmentFlag mapping: AlignLeft=1, AlignRight=2, AlignHCenter=4
            if (val & 1) return 'left';   // AlignLeft
            if (val & 2) return 'right';  // AlignRight
            if (val & 4) return 'center'; // AlignHCenter
        }
        return 'center';
    };

    // 1.1 Find the actual state root
    let state = rootState;
    if (rootState.project_state) state = rootState.project_state;
    else if (rootState.project) state = rootState.project;
    else if (rootState.state) state = rootState.state;
    else if (rootState.data) state = rootState.data;

    // 2. Load images from unique_images folder
    const images: Record<string, string> = {};
    const uniqueImagesFolder = zip.folder('unique_images');
    if (uniqueImagesFolder) {
        await Promise.all(Object.keys(uniqueImagesFolder.files).map(async (fullPath) => {
            if (fullPath.startsWith('unique_images/') && !fullPath.endsWith('/')) {
                const fileName = fullPath.split('/').pop() || '';
                const file = zip.file(fullPath);
                if (file) {
                    const blob = await file.async('blob');
                    images[fileName] = URL.createObjectURL(blob);
                }
            }
        }));
    }

    // 3. Map TextBlocks to TextObjects
    const textObjects: any[] = [];
    const imageStates = state.image_states || state.pages || state.images || {};

    for (const [filePath, rawImgState] of Object.entries<any>(imageStates)) {
        const imgState = unwrap(rawImgState);
        const cleanImageId = (filePath.split(/[\\/]/).pop() || filePath).toLowerCase();

        // A. Try to load from rendered TextItems if they exist (contains full styling)
        const viewerState = unwrap(imgState.viewer_state);
        const renderedItems = viewerState?.text_items_state || [];

        if (Array.isArray(renderedItems) && renderedItems.length > 0) {
            for (const item of renderedItems) {
                const pos = item.position || [0, 0];
                const width = item.width || 100;

                // Qt Point to Px conversion (approx 1.333)
                const fontSize = (item.font_size || 20) * 1.333;

                textObjects.push({
                    id: crypto.randomUUID(),
                    imageId: cleanImageId,
                    text: stripHtml(item.text),
                    originalText: '',
                    x: pos[0],
                    // Adjust Y for font metric differences (often Qt baseline vs top-left)
                    y: pos[1] + 7,
                    width: width,
                    height: item.height || 40,
                    fontSize: fontSize,
                    fontFamily: item.font_family || 'Inter',
                    color: convertColor(item.text_color),
                    fontWeight: item.bold ? 'bold' : 'normal',
                    fontStyle: item.italic ? 'italic' : 'normal',
                    textAlign: convertAlignment(item.alignment),
                    rotation: item.rotation || 0,
                    strokeWidth: item.outline_width || 0,
                    strokeColor: convertColor(item.outline_color) || '#000000',
                    backgroundColor: 'transparent',
                    lineHeight: item.line_spacing || 1.1, // Tighter line height
                    letterSpacing: 0,
                    opacity: 1
                });
            }
            continue; // Skip blk_list if we have rendered items
        }

        // B. Fallback to blk_list if no rendered items
        let blocks: any[] = [];
        if (Array.isArray(imgState)) {
            blocks = imgState;
        } else if (imgState && typeof imgState === 'object') {
            blocks = imgState.blk_list || imgState.text_blocks || imgState.blocks || imgState.annotations || imgState.objects || [];
        }

        if (!Array.isArray(blocks)) continue;

        for (const rawBlock of blocks) {
            const block = unwrap(rawBlock);
            // TextBlock uses [x1, y1, x2, y2]
            const box = getBox(block.xyxy || block.box || block.bbox || block.bubble_xyxy) || [0, 0, 100, 50];

            // Qt Point to Px conversion (approx 1.333)
            // Also adjust Y slightly as Qt draws from top-left baseline differently than Web
            const fontSize = (unwrap(block.font_size || block.size || block.max_font_size) || 20) * 1.333;

            textObjects.push({
                id: crypto.randomUUID(),
                imageId: cleanImageId,
                // In comic-translate, 'translation' is the translated text, 'text' is original
                text: stripHtml(unwrap(block.translation) || unwrap(block.text) || ''),
                originalText: stripHtml(unwrap(block.text) || unwrap(block.original_text) || unwrap(block.original) || ''),
                x: box[0],
                // Adjust Y for font metric differences (descent)
                y: box[1] + 7,
                width: Math.max(1, box[2] - box[0]),
                height: Math.max(1, box[3] - box[1]),
                fontSize: fontSize,
                fontFamily: unwrap(block.font_family || block.font) || 'Inter',
                color: convertColor(block.color || block.font_color || block.font_colour),
                fontWeight: unwrap(block.font_weight || block.bold) === true || unwrap(block.bold) ? 'bold' : 'normal',
                fontStyle: unwrap(block.italic) ? 'italic' : 'normal',
                textAlign: convertAlignment(block.text_align || block.alignment),
                rotation: unwrap(block.rotation || block.angle) || 0,
                strokeWidth: unwrap(block.outline_width) || 0,
                strokeColor: convertColor(block.outline_color) || '#000000',
                backgroundColor: unwrap(block.background_color) || 'transparent',
                lineHeight: unwrap(block.line_height) || 1.1, // Tighter line height for comic text
                letterSpacing: unwrap(block.letter_spacing) || 0,
                opacity: unwrap(block.opacity) ?? 1
            });
        }
    }

    // 4. Map Patches to EraserObjects
    const eraserObjects: any[] = [];
    const imagePatches = state.image_patches || state.patches || state.edits || state.drawings || {};

    for (const [pagePath, patches] of Object.entries<any>(imagePatches)) {
        if (!Array.isArray(patches)) continue;

        for (const rawPatch of patches) {
            const patch = unwrap(rawPatch);
            // Patch bbox from comic-translate is often [x, y, w, h]
            const bbox = getBox(patch.bbox || patch.box) || [0, 0, 0, 0];
            let pngPath = patch.png_path || patch.path || patch.mask_path;
            if (!pngPath) continue;

            // Normalize path: unique_patches subfolder logic
            // In ZIP, patches are usually in unique_patches/
            if (!pngPath.startsWith('unique_patches/')) {
                pngPath = `unique_patches/${pngPath}`;
            }

            // Extract patch image
            const patchFile = zip.file(pngPath);
            if (patchFile) {
                const patchBlob = await patchFile.async('blob');
                const patchUrl = URL.createObjectURL(patchBlob);

                // Normalize ID to filename lowercase
                const cleanImageId = (pagePath.split(/[\\/]/).pop() || pagePath).toLowerCase();

                eraserObjects.push({
                    id: crypto.randomUUID(),
                    imageId: cleanImageId,
                    type: 'patch',
                    x: bbox[0],
                    y: bbox[1],
                    // Convert [x, y, w, h] to [x1, y1, x2, y2]
                    x1: bbox[0],
                    y1: bbox[1],
                    x2: bbox[0] + bbox[2],
                    y2: bbox[1] + bbox[3],
                    resultImage: patchUrl,
                    strokeWidth: 0,
                    color: 'transparent'
                });
            }
        }
    }

    return {
        textObjects,
        eraserObjects,
        images
    };
}
