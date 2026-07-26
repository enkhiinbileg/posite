const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple .env.local parser
function loadEnv() {
    const envPath = '.env.local';
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });
    return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log(`Checking Webtoon ID: 54...`);
    const { data: webtoon, error: wError } = await supabase
        .from('webtoons')
        .select('id, title')
        .eq('id', Number(54))
        .maybeSingle();

    if (wError) console.error('Webtoon 54 Error:', wError.message);
    else if (!webtoon) console.log('Webtoon 54: NOT FOUND');
    else console.log('Webtoon 54 Found:', webtoon.title);

    console.log(`\nChecking Chapter ID: 263...`);
    const { data: chapter, error: cError } = await supabase
        .from('chapters')
        .select('id, title, webtoon_id')
        .eq('id', Number(263))
        .maybeSingle();

    if (cError) console.error('Chapter 263 Error:', cError.message);
    else if (!chapter) console.log('Chapter 263: NOT FOUND');
    else console.log('Chapter 263 Found:', chapter.title, `(Webtoon ID: ${chapter.webtoon_id})`);
}

checkData();
