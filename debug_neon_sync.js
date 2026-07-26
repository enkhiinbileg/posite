
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function debugNeonChapters() {
    let DATABASE_URL;
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('NEON_DATABASE_URL=')) DATABASE_URL = line.split('=')[1].trim();
            }
        }
    } catch (e) { }

    if (!DATABASE_URL) {
        console.error('Missing Neon NEON_DATABASE_URL');
        process.exit(1);
    }

    const sql = neon(DATABASE_URL);

    try {
        console.log('--- Debugging NEON Sync ---');
        const counts = await sql`
            SELECT webtoon_id, COUNT(*) as count 
            FROM chapters 
            GROUP BY webtoon_id 
            ORDER BY count DESC 
            LIMIT 10
        `;
        console.log('Chapter counts in Neon (top 10):', counts);
        
        const [w60] = await sql`SELECT id, title FROM webtoons WHERE id = 60`;
        console.log('Webtoon 60 in Neon:', w60);
        
    } catch (err) {
        console.error('Neon error:', err.message);
    }
}

debugNeonChapters();
