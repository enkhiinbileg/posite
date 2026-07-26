const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const DATABASE_URL = process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ Error: NEON_DATABASE_URL not found in .env.local');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
    try {
        console.log('🚀 Running NSFW Migration on Neon...');
        
        const queries = [
            `ALTER TABLE webtoons ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN DEFAULT FALSE`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_nsfw BOOLEAN DEFAULT FALSE`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nsfw_vip_expiration TIMESTAMPTZ DEFAULT NULL`,
            `CREATE INDEX IF NOT EXISTS idx_webtoons_is_nsfw ON webtoons(is_nsfw)`,
            `CREATE OR REPLACE FUNCTION public.has_nsfw_vip(user_uuid UUID)
             RETURNS BOOLEAN AS $$
               SELECT EXISTS (
                 SELECT 1 FROM public.profiles 
                 WHERE id = user_uuid AND nsfw_vip_expiration > NOW()
               );
             $$ LANGUAGE sql SECURITY DEFINER`
        ];

        for (const q of queries) {
            await sql.query(q);
        }
        
        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
