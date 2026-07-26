import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // @ts-ignore
        revalidateTag('webtoons');
        // @ts-ignore
        revalidateTag('chapters');
        // @ts-ignore
        revalidatePath('/', 'layout');

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            message: 'All caches cleared successfully (webtoons, chapters, layout)'
        });
    } catch (err) {
        return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
    }
}
