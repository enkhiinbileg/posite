
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkID60() {
    const targetID = 60;
    console.log(`--- Detailed Check for ID: ${targetID} ---`);

    const { data: chapters } = await supabase
        .from('chapters')
        .select('id, title, is_published, published_at, date, images')
        .eq('webtoon_id', targetID);

    console.log('Chapters found:', chapters.length);
    chapters.forEach(s => {
        console.log(`ID: ${s.id} | Title: ${s.title} | Published: ${s.is_published} | Date: ${s.date} | Images: ${typeof s.images} ${Array.isArray(s.images) ? 'Array' : 'Not Array'}`);
        console.log('Images content:', s.images);
    });
}
checkID60();
