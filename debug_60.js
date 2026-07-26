
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function debugWebtoon60() {
    let supabaseUrl, supabaseServiceKey;
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
                if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceKey = line.split('=')[1].trim();
            }
        }
    } catch (e) { }

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('--- Debugging Webtoon 60 ---');
    const { data: webtoon, error: wError } = await supabase
        .from('webtoons')
        .select('*')
        .eq('id', 60)
        .single();
    
    if (wError) {
        console.error('Webtoon 60 not found or error:', wError.message);
    } else {
        console.log('Webtoon 60 data:', JSON.stringify(webtoon, null, 2));
    }

    const { data: chapters, error: cError } = await supabase
        .from('chapters')
        .select('id, title, is_published')
        .eq('webtoon_id', 60);

    if (cError) {
        console.error('Error fetching chapters:', cError.message);
    } else {
        console.log('Chapters found:', chapters.length);
        console.log('Published chapters:', chapters.filter(c => c.is_published).length);
        console.log('First 5 chapters snapshot:', chapters.slice(0, 5));
    }
}

debugWebtoon60();
