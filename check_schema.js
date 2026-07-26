const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const sql = neon(process.env.NEON_DATABASE_URL);

async function checkSchema() {
    try {
        console.log('--- PROFILES ---');
        const profilesCols = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY column_name
        `;
        profilesCols.forEach(row => console.log(row.column_name));

        console.log('\n--- WEBTOONS ---');
        const webtoonsCols = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'webtoons'
            ORDER BY column_name
        `;
        webtoonsCols.forEach(row => console.log(row.column_name));
    } catch (err) {
        console.error('Error checking schema:', err.message);
    }
}

checkSchema();
