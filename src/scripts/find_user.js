const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser(num) {
    const hex = Number(num).toString(16);
    console.log(`Searching for numeric ID ${num} (Hex prefix: ${hex})`);
    
    // We fetch all profiles and filter locally just to see who this user is
    const { data, error } = await db.from('profiles').select('*');
    if (error) {
        console.error(error);
        return;
    }
    
    const matched = data.filter(p => p.id.startsWith(hex) || (p.unique_id && p.unique_id.includes(num)));
    console.log("Matched Users:", matched.map(m => ({ id: m.id, email: m.email, unique_id: m.unique_id })));
}

checkUser('3458843087');
