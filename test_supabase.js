require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtlwllzaxscxqtcoqpll.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.log('No key found!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: webtoon, error: err1 } = await supabase.from('webtoons').select('*').eq('id', 60).single();
    const { data: chapter, error: err2 } = await supabase.from('chapters').select('*').eq('id', 355).single();

    console.log('Webtoon:', webtoon ? 'FOUND' : 'MISSING', err1);
    console.log('Chapter:', chapter ? 'FOUND' : 'MISSING', err2);
}

test();
