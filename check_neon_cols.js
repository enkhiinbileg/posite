
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function checkNeonCols() {
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

    const sql = neon(DATABASE_URL);

    try {
        const cols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chapters'
        `;
        console.log('Neon Chapters Columns:', cols.map(c => `${c.column_name} (${c.data_type})`));
    } catch (err) {
        console.error('Neon error:', err.message);
    }
}
checkNeonCols();
