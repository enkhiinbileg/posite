import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // Ensure you have admin client
import { postToFacebook } from '@/lib/social';

// Webhook Secret for security
const WEBHOOK_SECRET = process.env.SOCIAL_WEBHOOK_SECRET || 'secret123';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Secret (Basic protection)
        const secret = req.headers.get('x-webhook-secret');
        if (secret !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, table, record, old_record } = body;

        // Only care about INSERT on public.chapters
        if (type !== 'INSERT' || table !== 'chapters') {
            return NextResponse.json({ message: 'Ignored' });
        }

        const { webtoon_id, chapter_number, title } = record;

        // 2. Count total chapters to check milestone
        const { count, error } = await supabaseAdmin
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('webtoon_id', webtoon_id)
            .lte('published_at', new Date().toISOString());

        if (error || count === null) {
            console.error("Count Error:", error);
            return NextResponse.json({ error: 'DB Error' }, { status: 500 });
        }

        // 3. Check Condition (Divisible by 5)
        // Note: count might be slightly lagged or inclusive. 
        // Ideally 'count' should include the new record. 
        // If trigger is AFTER INSERT, DB count should include it.
        if (count % 5 === 0 && count > 0) {

            // 4. Fetch Webtoon Info (Image & Title)
            const { data: webtoon } = await supabaseAdmin
                .from('webtoons')
                .select('title, image')
                .eq('id', webtoon_id)
                .single();

            if (webtoon) {
                const message = `🔥 ${webtoon.title} цувралын шинэ ${chapter_number}-р бүлэг орлоо! \n\nНийт ${count} бүлэгтэй боллоо. Яг одоо манай сайтаас уншаарай! 👇\nhttps://your-site.com/webtoon/${webtoon_id}`;

                /*
                // 5. Post to Social
                const result = await postToFacebook(message, webtoon.image);

                if (result.success) {
                    console.log(`Posted to FB: ${result.postId}`);
                    return NextResponse.json({ success: true, postId: result.postId });
                } else {
                    console.error("FB Post Failed:", result.error);
                }
                */
                console.log("[FACEBOOK] Posting is temporarily disabled in webhook.");
            }
        }

        return NextResponse.json({ message: 'No Milestone', count });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
