
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    const supabaseUrl = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
    const supabaseKey = 'sb_publishable_NvSar9oXpw34tWyz3vqRBg_oVhNlAib';

    console.log('Testing connection to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const start = Date.now();
        // Try a very simple query that doesn't need auth if RLS is public or just to check connection
        // We'll query 'webtoons' count as it's likely public read
        const { data, error } = await supabase.from('webtoons').select('count', { count: 'exact', head: true });
        const duration = Date.now() - start;

        if (error) {
            console.error('Connection Failed:', error.message);
            // Determine if it's a network error or DB error
            if (error.code) console.error('Error Code:', error.code);
        } else {
            console.log(`Connection Successful! (Took ${duration}ms)`);
            console.log('Database is ONLINE and responding.');
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testConnection();
