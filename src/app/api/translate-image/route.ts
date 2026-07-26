
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('image');
        const targetLang = formData.get('target_lang') || 'mn';
        const model = formData.get('model') || 'gpt-4o';

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Priority: Custom Header -> Env Var -> Default Localhost
        const pythonApiUrl = req.headers.get('X-Backend-Url') || process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

        try {
            // Modal линк өөрөө endpoint тул шууд ашиглана
            const finalUrl = pythonApiUrl;

            console.log("🚀 Calling AI Backend (this might take time on first run):", finalUrl);

            const pythonResponse = await fetch(finalUrl, {
                method: 'POST',
                body: formData,
                // Заримдаа сервер тал дээр удаан хүлээх шаардлага гардаг
                cache: 'no-store',
            });

            if (!pythonResponse.ok) {
                const errorText = await pythonResponse.text();
                console.error("❌ Python Backend Error:", pythonResponse.status, errorText);
                return NextResponse.json({ error: `AI Server Error (${pythonResponse.status})` }, { status: 502 });
            }

            const processedImageBlob = await pythonResponse.blob();
            return new NextResponse(processedImageBlob, {
                headers: { 'Content-Type': 'image/png' },
            });

        } catch (error: any) {
            console.error("❌ Connection Error:", error.message);
            return NextResponse.json({
                error: 'Could not connect to AI Server. Please check if the link is correct.'
            }, { status: 503 });
        }

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
