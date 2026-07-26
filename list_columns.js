
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

async function listColumns() {
    const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Data fetch error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('--- ALL COLUMNS IN CHAPTERS ---');
        console.log(Object.keys(data[0]).join(', '));
        console.log('--- SAMPLE DATA ---');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No chapters found to inspect columns.');
    }
}

listColumns();
