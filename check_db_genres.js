
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase.from('webtoons').select('genres').limit(100);
    if (error) {
        console.error('Error fetching webtoons:', error);
        return;
    }
    const allGenres = new Set();
    data.forEach(w => {
        if (Array.isArray(w.genres)) {
            w.genres.forEach(g => allGenres.add(g));
        }
    });
    console.log('--- GENRES IN DATABASE ---');
    console.log(Array.from(allGenres).join(', '));
    console.log('-------------------------');
}

check();
