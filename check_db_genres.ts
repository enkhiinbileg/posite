// @ts-nocheck

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase.from('webtoons').select('genres').limit(50);
    if (error) console.error(error);
    else {
        const allGenres = new Set();
        data.forEach(w => w.genres?.forEach(g => allGenres.add(g)));
        console.log('Genres in DB:', Array.from(allGenres));
    }
}

check();
