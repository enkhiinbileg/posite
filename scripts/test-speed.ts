
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function test() {
    console.log('Testing Supabase Connection Speed...')
    console.log('URL:', url)
    const supabase = createClient(url, key)

    const start = Date.now()
    try {
        const { data, error } = await supabase.from('webtoons').select('id').limit(1)
        const end = Date.now()
        if (error) {
            console.error('Query Error:', error)
        } else {
            console.log('Query Successful!')
            console.log('Time taken:', (end - start), 'ms')
            console.log('Data:', data)
        }
    } catch (e) {
        console.error('Catch Error:', e)
    }
}

test()
