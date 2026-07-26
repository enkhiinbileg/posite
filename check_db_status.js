const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('--- Checking Profiles Count ---');
    const { count: profileCount, error: pError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log('Profiles:', profileCount, pError || '');

    console.log('\n--- Checking VIP Grants Count ---');
    const { count: grantCount, error: gError } = await supabase.from('vip_grants').select('*', { count: 'exact', head: true });
    console.log('VIP Grants:', grantCount, gError || '');

    console.log('\n--- Recent 3 VIP Grants ---');
    const { data: recentGrants, error: rgError } = await supabase
        .from('vip_grants')
        .select('*, profiles(full_name, unique_id)')
        .order('granted_at', { ascending: false })
        .limit(3);

    if (rgError) console.error('Error fetching recent grants:', rgError);
    else console.log(JSON.stringify(recentGrants, null, 2));

    console.log('\n--- Checking for NULL unique_id ---');
    const { count: nullIdCount, error: niError } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).is('unique_id', null);
    console.log('Profiles with NULL unique_id:', nullIdCount, niError || '');
}

checkStatus();
