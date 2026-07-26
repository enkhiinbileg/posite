
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL missing' }, { status: 400 });
        }

        console.log("🔍 Scraping chapter from:", url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Sec-Ch-Ua': '"Not A(Bit:Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache',
            },
            next: { revalidate: 0 }
        });

        const html = await response.text();

        if (!response.ok) {
            const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

            if (html.includes('Cloudflare') || html.includes('cf-browser-verification') || title.includes('Cloudflare') || title.includes('Attention Required')) {
                return NextResponse.json({
                    error: 'Cloudflare хамгаалалттай сайт байна. Зургийн линкүүдийг (Image Links) жагсаалтаар хуулж тавина уу.'
                }, { status: 403 });
            }
            return NextResponse.json({ error: `Сайт хариу өгөхгүй байна: ${response.status} (${title})` }, { status: response.status });
        }

        // --- 1. NEXT.JS / NUXT DATA EXTRACTION ---
        const chapterImages: { url: string, order?: number }[] = [];
        const nextDataRegex = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
        const nextMatch = html.match(nextDataRegex);
        if (nextMatch) {
            try {
                const data = JSON.parse(nextMatch[1]);
                // Recursive search for anything that looks like a webtoon image in the state
                const search = (obj: any) => {
                    if (typeof obj === 'string') {
                        if (obj.match(/\.(jpg|jpeg|png|webp|avif)/i) &&
                            (obj.includes('optimized') || obj.includes('chapter') || obj.includes('storage/media') || obj.includes('cdn'))) {
                            chapterImages.push({ url: obj.startsWith('//') ? 'https:' + obj : obj });
                        }
                    } else if (typeof obj === 'object' && obj !== null) {
                        Object.values(obj).forEach(search);
                    }
                };
                search(data);
            } catch (e) { }
        }

        // Look for __next_f fragments
        const pagesArrayRegex = /"pages":\s*(\[[^\]]+\])/g;
        let pagesMatch;
        while ((pagesMatch = pagesArrayRegex.exec(html)) !== null) {
            try {
                const jsonStr = pagesMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                const pages = JSON.parse(jsonStr);
                if (Array.isArray(pages)) {
                    pages.forEach(p => {
                        const u = p.url || p.image || p.src;
                        if (u && !u.includes('-thumb') && !u.includes('-cover')) {
                            chapterImages.push({
                                url: u.startsWith('//') ? 'https:' + u : u,
                                order: p.order
                            });
                        }
                    });
                }
            } catch (e) { }
        }

        // --- 2. GLOBAL REGEX SEARCH ---
        const fallbackUrls: string[] = [];
        const globalUrlRegex = /(https?:)?\/\/[^"'\s\\]+\.(jpg|jpeg|png|webp|avif)(?:\?[^"'\s\\]+)?/gi;

        let match;
        while ((match = globalUrlRegex.exec(html)) !== null) {
            let src = match[0];
            if (src.startsWith('//')) src = 'https:' + src;
            src = src.replace(/\\u002f/g, '/').replace(/\\/g, '');

            const lower = src.toLowerCase();
            const isThumbnail = lower.includes('thumb') || lower.includes('cover') || lower.includes('avatar') || lower.includes('logo') || lower.includes('icon');
            const isContent = lower.includes('optimized') || lower.includes('conversions') || lower.includes('chapter') || lower.includes('page') || lower.includes('manga') || lower.includes('book');

            if (isContent && !isThumbnail) {
                fallbackUrls.push(src);
            }
        }

        // --- 3. FINAL DECISION ---
        let finalImages: string[] = [];

        if (chapterImages.length > 5) {
            // Sort by order if available
            chapterImages.sort((a, b) => (a.order || 0) - (b.order || 0));
            finalImages = [...new Set(chapterImages.map(img => img.url))];
        } else {
            finalImages = [...new Set(fallbackUrls)].sort((a, b) => {
                const getNum = (s: string) => {
                    const m = s.split('/').pop()?.match(/\d+/);
                    return m ? parseInt(m[0]) : 0;
                };
                return getNum(a) - getNum(b);
            });
        }

        // Removal of duplicates and UI junk
        finalImages = finalImages.filter(src => {
            const lower = src.toLowerCase();
            return !lower.includes('facebook') && !lower.includes('twitter') && !lower.includes('discord') && !lower.includes('shared');
        });

        if (finalImages.length === 0) {
            // If we found nothing, let's see if there's an error in the page title
            const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

            if (title.includes('Attention Required') || title.includes('Cloudflare')) {
                return NextResponse.json({ error: 'Cloudflare хамгаалалттай сайт байна. Пракси ашиглах боломжгүй.' }, { status: 403 });
            }

            return NextResponse.json({ error: `Зураг олдсонгүй (Сайтын гарчиг: ${title}). Линкүүдээ шууд хуулж тавина уу.` }, { status: 404 });
        }

        return NextResponse.json({
            images: finalImages,
            debug: { count: finalImages.length, title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] }
        });

    } catch (error: any) {
        console.error("Scrape Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
