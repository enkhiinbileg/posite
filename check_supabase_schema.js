const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function checkSupabaseSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('--- PROFILES ---');
        const profilesRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY column_name
        `);
        profilesRes.rows.forEach(row => console.log(row.column_name));

        console.log('\n--- WEBTOONS ---');
        const webtoonsRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'webtoons'
            ORDER BY column_name
        `);
        webtoonsRes.rows.forEach(row => console.log(row.column_name));

    } catch (err) {
        console.error('Error checking Supabase schema:', err.message);
    } finally {
        await client.end();
    }
}

checkSupabaseSchema();
