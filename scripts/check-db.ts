
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkActivity() {
    console.log('Checking DB Activity...')
    const supabase = createClient(url, key)

    try {
        // Query to see long-running queries
        const { data, error } = await supabase.rpc('get_active_queries')
        // Note: I might need to use a raw query if the RPC doesn't exist.
        // But since I can't do raw SQL easily via client without an RPC, 
        // I will try to fetch from a different table to see if it's just 'webtoons' table that's locked.

        console.log('Testing "homepage_sections" table (likely not locked)...')
        const start = Date.now()
        const { data: sections, error: secError } = await supabase.from('homepage_sections').select('id').limit(1)
        const end = Date.now()

        if (secError) {
            console.error('Homepage Sections fetch error:', secError)
        } else {
            console.log('Homepage Sections fetch took:', (end - start), 'ms')
        }

        console.log('Testing "webtoons" table (checking for locks)...')
        const start2 = Date.now()
        const { data: webtoons, error: webError } = await supabase.from('webtoons').select('id').limit(1)
        const end2 = Date.now()

        if (webError) {
            console.error('Webtoons fetch error:', webError)
        } else {
            console.log('Webtoons fetch took:', (end2 - start2), 'ms')
        }

    } catch (e) {
        console.error('Error:', e)
    }
}

checkActivity()
