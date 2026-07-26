
const { createClient } = require('@supabase/supabase-js');

async function testNewConnection() {
    const supabaseUrl = 'https://xdjzzurvaaesliiqpjrd.supabase.co';
    const supabaseKey = 'sb_publishable_MibaDUnj1qCWEZmC8dec-A_GjacfaWB';

    console.log('Testing connection to NEW project:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const start = Date.now();
        // In a brand new project, there are no tables yet. 
        // We just want to see if the API responds (even with an error like 'table not found' is fine).
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        const duration = Date.now() - start;

        if (error && error.message.includes('relation "public.profiles" does not exist')) {
            console.log(`Connection Successful! (Took ${duration}ms)`);
            console.log('NEW project is ONLINE. (Empty as expected).');
        } else if (error) {
            console.error('Connection Failed:', error.message);
        } else {
            console.log('Connection Successful!');
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testNewConnection();
