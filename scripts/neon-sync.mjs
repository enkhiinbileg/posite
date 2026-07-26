// Direct fetch from Supabase without ISP dependency — using explicit fetch with timeout
import { neon } from '@neondatabase/serverless';
import https from 'https';
import { URL } from 'url';

const NEON_URL = 'postgresql://neondb_owner:npg_KkUdao6mLf2h@ep-steep-thunder-aebeo889-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const SUPABASE_URL = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHdsbHpheHNjeHF0Y29xcGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ2MzE3MCwiZXhwIjoyMDg0MDM5MTcwfQ.grVYoFJlGjO5VUcfAQkd2UGY-10h254SArSYmyzMOaw';

const sql = neon(NEON_URL);

// Fetch with 30s timeout using native https module (bypasses Fetch API ISP issues)
function httpsGet(urlStr, headers) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlStr);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers,
            timeout: 30000,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`JSON parse failed: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

async function fetchSupabase(table, params = '', limit = 1000) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}&limit=${limit}&order=id.asc`;
    console.log(`  → Fetching ${table}...`);

    const data = await httpsGet(url, {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Accept': 'application/json',
    });

    if (!Array.isArray(data)) {
        throw new Error(`Expected array, got: ${JSON.stringify(data).substring(0, 100)}`);
    }
    return data;
}

async function main() {
    console.log('🚀 Sync: Supabase → Neon\n');

    // ── WEBTOONS ──
    try {
        const data = await fetchSupabase('webtoons', 'select=*', 2000);
        console.log(`  Found ${data.length} webtoons`);
        let ok = 0;
        for (const w of data) {
            try {
                await sql`
                    INSERT INTO webtoons (id,title,description,image,cover_image,genres,status,rating,rating_count,views,bookmark_count,follow_count,like_count,chapter_count,is_new,is_featured,author,artist,release_year,age_rating,created_at,updated_at)
                    VALUES (${w.id},${w.title},${w.description ?? null},${w.image ?? null},${w.cover_image ?? null},${w.genres ?? []},${w.status ?? 'Ongoing'},${w.rating ?? 0},${w.rating_count ?? 0},${w.views ?? 0},${w.bookmark_count ?? 0},${w.follow_count ?? 0},${w.like_count ?? 0},${w.chapter_count ?? 0},${w.is_new ?? false},${w.is_featured ?? false},${w.author ?? null},${w.artist ?? null},${w.release_year ?? null},${w.age_rating ?? 'All Ages'},${w.created_at ?? new Date().toISOString()},${w.updated_at ?? w.created_at ?? new Date().toISOString()})
                    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,image=EXCLUDED.image,rating=EXCLUDED.rating,views=EXCLUDED.views,status=EXCLUDED.status
                `;
                ok++;
            } catch (e) { if (!e.message.includes('dup')) console.warn(`    webtoon ${w.id}:${e.message.slice(0, 80)}`); }
        }
        console.log(`✅ Webtoons: ${ok}/${data.length}`);
    } catch (e) { console.error('❌ Webtoons:', e.message); }

    // ── CHAPTERS (fetch in pages) ──
    try {
        let offset = 0;
        let totalOk = 0;
        let totalFetched = 0;
        while (true) {
            // Updated columns to match Supabase's actual schema
            const data = await fetchSupabase('chapters', `select=id,webtoon_id,title,chapter_number,images,views,is_published,created_at,published_at&offset=${offset}`, 500);
            if (data.length === 0) break;
            totalFetched += data.length;
            for (const c of data) {
                try {
                    await sql`
                        INSERT INTO chapters (id,webtoon_id,title,order_index,images,view_count,like_count,is_published,created_at,updated_at)
                        VALUES (${c.id},${c.webtoon_id},${c.title ?? null},${c.chapter_number ?? 0},${JSON.stringify(c.images ?? [])},${c.views ?? 0},0,${c.is_published !== false},${c.created_at ?? new Date().toISOString()},${c.published_at ?? c.created_at ?? new Date().toISOString()})
                        ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,images=EXCLUDED.images,view_count=EXCLUDED.view_count,order_index=EXCLUDED.order_index,is_published=EXCLUDED.is_published
                    `;
                    totalOk++;
                } catch (e) { if (!e.message.includes('dup')) console.warn(`    ch ${c.id}:${e.message.slice(0, 60)}`); }
            }
            console.log(`  Chapters batch: offset=${offset}, got ${data.length}`);
            if (data.length < 500) break;
            offset += 500;
        }
        console.log(`✅ Chapters: ${totalOk}/${totalFetched}`);
    } catch (e) { console.error('❌ Chapters:', e.message); }

    // ── BANNERS ──
    try {
        const data = await fetchSupabase('banners', 'select=*');
        let ok = 0;
        for (const b of data) {
            try {
                await sql`
                    INSERT INTO banners (id,webtoon_id,title,description,image_url,image_mobile_url,link_url,sort_order,is_active,created_at)
                    VALUES (${b.id},${b.webtoon_id ?? null},${b.title ?? null},${b.description ?? null},${b.image_url ?? null},${b.image_mobile_url ?? null},${b.link_url ?? null},${b.sort_order ?? 0},${b.is_active !== false},${b.created_at ?? new Date().toISOString()})
                    ON CONFLICT(id) DO UPDATE SET is_active=EXCLUDED.is_active,sort_order=EXCLUDED.sort_order
                `;
                ok++;
            } catch (e) { if (!e.message.includes('dup')) console.warn(`    banner:${e.message.slice(0, 80)}`); }
        }
        console.log(`✅ Banners: ${ok}/${data.length}`);
    } catch (e) { console.error('❌ Banners:', e.message); }

    // ── HOMEPAGE SECTIONS ──
    try {
        await sql`DELETE FROM homepage_sections`;
        const data = await fetchSupabase('homepage_sections', 'select=*');
        let ok = 0;
        for (const s of data) {
            try {
                await sql`
                    INSERT INTO homepage_sections (id,title,type,order_index,is_visible,metadata,created_at)
                    VALUES (${s.id},${s.title},${s.type},${s.order_index ?? 0},${s.is_visible !== false},${JSON.stringify(s.metadata ?? {})},${s.created_at ?? new Date().toISOString()})
                    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,type=EXCLUDED.type,order_index=EXCLUDED.order_index,is_visible=EXCLUDED.is_visible,metadata=EXCLUDED.metadata
                `;
                ok++;
            } catch (e) { console.warn(`    section:${e.message.slice(0, 80)}`); }
        }
        console.log(`✅ Sections: ${ok}/${data.length}`);
    } catch (e) { console.error('❌ Sections:', e.message); }

    // ── VERIFY ──
    const counts = await sql`SELECT 
        (SELECT COUNT(*) FROM webtoons) as webtoons,
        (SELECT COUNT(*) FROM chapters) as chapters,
        (SELECT COUNT(*) FROM banners) as banners,
        (SELECT COUNT(*) FROM homepage_sections) as sections
    `;
    console.log('\n📊 Final counts:', counts[0]);
    console.log('🎉 Done!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
