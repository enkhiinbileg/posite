// Quick test of Neon connection
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_KkUdao6mLf2h@ep-steep-thunder-aebeo889-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function test() {
    console.log('Testing Neon connection...');

    const webtoons = await sql`SELECT COUNT(*) as count FROM webtoons`;
    console.log('Webtoons count:', webtoons[0].count);

    const banners = await sql`SELECT COUNT(*) as count FROM banners`;
    console.log('Banners count:', banners[0].count);

    const sections = await sql`SELECT COUNT(*) as count FROM homepage_sections`;
    console.log('Sections count:', sections[0].count);

    const chapters = await sql`SELECT COUNT(*) as count FROM chapters`;
    console.log('Chapters count:', chapters[0].count);

    // Test the actual query used in page.tsx
    const sample = await sql`SELECT id, title, image, rating FROM webtoons ORDER BY rating DESC LIMIT 3`;
    console.log('\nSample webtoons:', JSON.stringify(sample, null, 2));

    const sampleBanners = await sql`
        SELECT b.*, w.title as w_title FROM banners b
        LEFT JOIN webtoons w ON w.id = b.webtoon_id
        WHERE b.is_active = true LIMIT 3
    `;
    console.log('\nSample banners:', JSON.stringify(sampleBanners, null, 2));
}

test().catch(console.error);
