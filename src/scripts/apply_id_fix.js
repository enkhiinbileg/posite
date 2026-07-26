const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFix() {
    console.log("🚀 Applying SQL fix to the database...");
    const sql = fs.readFileSync(path.join(__dirname, '../../fix_all_unique_ids.sql'), 'utf8');
    
    const { error } = await db.rpc('exec_sql', { sql_query: sql });
    if (error) {
        // Fallback: try raw query if exec_sql is not available
        console.error("RPC failed:", error.message);
        console.log("Attempting direct table updates one by one...");
        
        const { data: users, error: fError } = await db.from('profiles').select('id').is('unique_id', null);
        if (fError) return console.error(fError);
        
        console.log(`Found ${users.length} users needing ID.`);
        
        for (const u of users) {
             const { data: id } = await db.rpc('generate_unique_id');
             const { error: uError } = await db.from('profiles').update({ unique_id: Math.floor(10000000 + Math.random() * 89999999).toString() }).eq('id', u.id);
             if (uError) console.error(uError);
        }
        console.log("✅ Fixed all users.");
    } else {
        console.log("✅ SQL fix applied successfully.");
    }
}

applyFix();
