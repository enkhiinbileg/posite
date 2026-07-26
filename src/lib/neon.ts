import { neon, neonConfig } from '@neondatabase/serverless';

// Neon database client — PRIMARY database (no ISP block)
// Supabase is kept for Auth only
neonConfig.fetchConnectionCache = true;
const sql = neon(process.env.NEON_DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy");

export default sql;

// Helper for dynamic queries
async function query(text: string, values?: any[]) {
    return sql.query(text, values);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC DATA QUERIES (no ISP block, no auth required)
// ─────────────────────────────────────────────────────────────────────────────

export async function neonFetchWebtoons(params: {
    from: number;
    to: number;
    sort?: string;
    status?: string;
    genre?: string;
    search?: string;
}) {
    try {
        let orderBy = 'rating DESC';
        if (params.sort === 'newest') orderBy = 'created_at DESC';
        else if (params.sort === 'a-z') orderBy = 'title ASC';

        const conditions: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        if (params.status && params.status !== 'all') {
            conditions.push(`status = $${paramIdx++}`);
            values.push(params.status === 'ongoing' ? 'Ongoing' : 'Completed');
        }
        if (params.genre && params.genre !== 'Бүх') {
            conditions.push(`genres::text ILIKE $${paramIdx++}`);
            values.push(`%${params.genre}%`);
        }
        if (params.search) {
            conditions.push(`title ILIKE $${paramIdx++}`);
            values.push(`%${params.search}%`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const lim = params.to - params.from + 1;
        const offset = params.from;

        const [countResult, data] = await Promise.all([
            query(`SELECT COUNT(*) as count FROM webtoons ${where}`, values),
            query(`SELECT * FROM webtoons ${where} ORDER BY ${orderBy} LIMIT ${lim} OFFSET ${offset}`, values)
        ]);

        return {
            success: true,
            data: data || [],
            count: parseInt((countResult as any)[0]?.count || '0')
        };
    } catch (error: any) {
        console.error("neonFetchWebtoons Error:", error);
        return { success: false, error: error.message, data: [], count: 0 };
    }
}

export async function neonFetchBanners() {
    try {
        const data = await sql`
            SELECT * FROM banners 
            WHERE is_active = true 
            ORDER BY order_index ASC
        `;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("neonFetchBanners Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function neonFetchHomepageSections() {
    try {
        const data = await sql`
            SELECT * FROM homepage_sections 
            WHERE is_visible = true 
            ORDER BY order_index ASC
        `;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("neonFetchHomepageSections Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function neonFetchLatestUpdates(limit: number = 50) {
    try {
        const data = await sql`
            SELECT 
                c.id, c.title, c.created_at, c.webtoon_id,
                w.id as w_id, w.title as w_title, w.image as w_image
            FROM chapters c
            LEFT JOIN webtoons w ON w.id = c.webtoon_id
            WHERE COALESCE(c.is_published, true) = true
              AND COALESCE(c.updated_at, c.created_at) <= NOW()
            ORDER BY c.created_at DESC
            LIMIT ${limit}
        `;
        // Reshape to match Supabase nested format
        const shaped = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            webtoon_id: row.webtoon_id,
            webtoons: {
                id: row.w_id,
                title: row.w_title,
                image: row.w_image,
            }
        }));
        return { success: true, data: shaped };
    } catch (error: any) {
        console.error("neonFetchLatestUpdates Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function neonFetchWebtoonById(id: number) {
    try {
        const [webtoon, chapters] = await Promise.all([
            sql`SELECT * FROM webtoons WHERE id = ${id} LIMIT 1`,
            sql`
                SELECT * FROM chapters
                WHERE webtoon_id = ${id}
                  AND COALESCE(is_published, true) = true
                  AND COALESCE(updated_at, created_at) <= NOW()
                ORDER BY order_index ASC
            `
        ]);
        return { success: true, webtoon: webtoon[0] || null, chapters: chapters || [] };
    } catch (error: any) {
        console.error("neonFetchWebtoonById Error:", error);
        return { success: false, error: error.message, webtoon: null, chapters: [] };
    }
}

export async function neonFetchChapterById(chapterId: number) {
    try {
        const [chapter] = await sql`
            SELECT * FROM chapters
            WHERE id = ${chapterId}
              AND COALESCE(is_published, true) = true
              AND COALESCE(updated_at, created_at) <= NOW()
            LIMIT 1
        `;
        return { success: true, data: chapter || null };
    } catch (error: any) {
        console.error("neonFetchChapterById Error:", error);
        return { success: false, error: error.message, data: null };
    }
}

export async function neonFetchChapterImages(chapterId: number) {
    try {
        const data = await sql`SELECT images FROM chapters WHERE id = ${chapterId} LIMIT 1`;
        return { success: true, data: data[0]?.images || [] };
    } catch (error: any) {
        console.error("neonFetchChapterImages Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}
export async function neonFetchNsfwWebtoons() {
    try {
        const data = await sql`
            SELECT * FROM webtoons 
            WHERE is_nsfw = true 
            ORDER BY rating DESC
        `;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("neonFetchNsfwWebtoons Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}
