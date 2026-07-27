import type { NextApiRequest, NextApiResponse } from 'next';

// Disable Next.js default body parser so we can handle the raw stream (bypasses 10MB memory limit)
export const config = {
    api: {
        bodyParser: false,
        sizeLimit: '2000mb',
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const targetUrl = req.headers['x-target-url'] as string;
    const contentType = req.headers['content-type'] as string;
    const contentLength = req.headers['content-length'] as string;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing target URL' });
    }

    try {
        const headers: HeadersInit = {
            'Content-Type': contentType || 'application/octet-stream',
        };
        
        if (contentLength) {
            headers['Content-Length'] = contentLength;
        }

        // fetch requires standard ReadableStream or Node.js streams but native fetch sometimes has issues with IncomingMessage
        // We can use node-fetch or native fetch with duplex: 'half'
        const response = await fetch(targetUrl, {
            method: 'PUT',
            // @ts-ignore req is a Readable stream in Node
            body: req,
            headers,
            // @ts-ignore
            duplex: 'half'
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('R2 Proxy Upload Error:', response.status, text);
            return res.status(response.status).json({ error: `R2 returned ${response.status}: ${text}` });
        }

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Proxy upload exception:', error);
        return res.status(500).json({ error: error.message });
    }
}
