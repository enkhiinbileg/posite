const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log(`Checking Webtoon ID: 54...`);
    const { data: webtoon, error: wError } = await supabase
        .from('webtoons')
        .select('id, title')
        .eq('id', 54)
        .single();

    if (wError) console.error('Webtoon 54 Error:', wError.message);
    else console.log('Webtoon 54 Found:', webtoon.title);

    console.log(`\nChecking Chapter ID: 263...`);
    const { data: chapter, error: cError } = await supabase
        .from('chapters')
        .select('id, title, webtoon_id')
        .eq('id', 263)
        .single();

    if (cError) console.error('Chapter 263 Error:', cError.message);
    else console.log('Chapter 263 Found:', chapter.title, `(Webtoon ID: ${chapter.webtoon_id})`);

    console.log(`\nChecking Chapters for Webtoon 54...`);
    const { data: chapters, error: csError } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('webtoon_id', 54)
        .limit(5);

    if (csError) console.error('Chapters List Error:', csError.message);
    else {
        console.log(`Found ${chapters.length} chapters for Webtoon 54:`);
        chapters.forEach(c => console.log(` - ID: ${c.id}, Title: ${c.title}`));
    }
}

checkData();
