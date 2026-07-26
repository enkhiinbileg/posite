
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load env from .env.local manually if dotenv is not available globally
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
} catch (e) {
    console.error('Error reading .env.local:', e);
}

supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Key:', supabaseServiceKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkChapters() {
    try {
        console.log('Checking chapters table...');
        const { data: chapters, error } = await supabase
            .from('chapters')
            .select('id, webtoon_id, title, published_at, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching chapters:', error);
            return;
        }

        console.log('Last 10 chapters:');
        console.table(chapters);

        const { data: webtoonIds } = await supabase
            .from('chapters')
            .select('webtoon_id')
            .limit(1);

        if (webtoonIds && webtoonIds.length > 0) {
            const sampleId = webtoonIds[0].webtoon_id;
            console.log(`\nChecking chapters for sample webtoon_id: ${sampleId}`);

            const { data: sampleChapters } = await supabase
                .from('chapters')
                .select('id, title, published_at')
                .eq('webtoon_id', sampleId);

            console.table(sampleChapters);

            const now = new Date().toISOString();
            const { data: filteredChapters } = await supabase
                .from('chapters')
                .select('id, title, published_at')
                .eq('webtoon_id', sampleId)
                .lte('published_at', now);

            console.log(`\nFiltered with .lte('published_at', '${now}'):`);
            console.table(filteredChapters);

            // Check if any have NULL published_at
            const { data: nullChapters } = await supabase
                .from('chapters')
                .select('id, title, published_at')
                .eq('webtoon_id', sampleId)
                .is('published_at', null);

            console.log(`\nChapters with NULL published_at for ID ${sampleId}:`);
            console.table(nullChapters);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkChapters();
