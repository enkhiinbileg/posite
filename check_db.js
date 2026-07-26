const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: webtoon, error: wError } = await supabase.from('webtoons').select('id, title').eq('id', 54).single();
    const { data: chapter, error: cError } = await supabase.from('chapters').select('id, title').eq('id', 264).single();

    console.log('Webtoon 54:', webtoon || 'NOT FOUND', wError?.message || '');
    console.log('Chapter 264:', chapter || 'NOT FOUND', cError?.message || '');
}

check();
