const { createClient } = require('@supabase/supabase-js');

async function checkData() {
    const supabaseUrl = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
    const supabaseKey = 'sb_publishable_NvSar9oXpw34tWyz3vqRBg_oVhNlAib';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Checking Webtoon 60 ---');
    const { data: w, error: we } = await supabase.from('webtoons').select('*').eq('id', 60).single();
    console.log('Webtoon:', w ? 'FOUND' : 'NOT FOUND');
    if (we) console.error('Error:', we.message);

    console.log('\n--- Checking Chapter 304 ---');
    const { data: c, error: ce } = await supabase.from('chapters').select('*').eq('id', 304).single();
    console.log('Chapter:', c ? 'FOUND' : 'NOT FOUND');
    if (ce) console.error('Error:', ce.message);

    if (c) {
        console.log('Chapter webtoon_id:', c.webtoon_id);
    }
}

checkData();
