/**
 * Utility to fetch a large file with progress reporting
 */
export async function fetchWithProgress(
    url: string,
    onProgress: (received: number, total: number) => void
): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) {
        // Fallback for browsers without stream support
        return await response.arrayBuffer();
    }

    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
            onProgress(received, total);
        }
    }

    const all = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks) {
        all.set(chunk, position);
        position += chunk.length;
    }

    return all.buffer;
}
