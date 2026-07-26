
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkCols() {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data[0]) {
        console.log('Chapters columns:', Object.keys(data[0]));
    } else {
        console.log('No chapters found');
    }
}
checkCols();
