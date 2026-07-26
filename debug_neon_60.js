
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function debugNeon60() {
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
        console.log('--- Debugging Webtoon 60 in NEON ---');
        const webtoons = await sql`SELECT * FROM webtoons WHERE id = 60`;
        const webtoon = webtoons[0];
        
        if (!webtoon) {
            console.error('Webtoon 60 NOT FOUND in Neon!');
        } else {
            console.log('Webtoon 60 found in Neon:', JSON.stringify(webtoon, null, 2));
        }

        const chapters = await sql`SELECT id, title, is_published FROM chapters WHERE webtoon_id = 60`;
        console.log('Chapters found in Neon:', chapters.length);
        console.log('Published chapters in Neon:', chapters.filter(c => !!c.is_published).length);
        
    } catch (err) {
        console.error('Neon error:', err.message);
    }
}

debugNeon60();
