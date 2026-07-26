
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

async function check() {
    const { count: total, error: e1 } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
    const { count: published, error: e2 } = await supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('is_published', true);
    const { count: withDate, error: e3 } = await supabase.from('chapters').select('*', { count: 'exact', head: true }).lte('published_at', new Date().toISOString());

    console.log('Total Chapters:', total);
    console.log('is_published: true count:', published);
    console.log('LTE published_at count:', withDate);
}
check();
