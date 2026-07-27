import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kcdzmijmghjljjbhcefp.supabase.co";

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc5OTEsImV4cCI6MjEwMDY0Mzk5MX0.x2dDcwsSUxENIrQbBvjgE6BUFwbk8ySGP3vo_husY1E";

const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHptaWptZ2hqbGpqYmhjZWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA2Nzk5MSwiZXhwIjoyMTAwNjQzOTkxfQ.la-UA331IJNuSCTAYgezOlDulEiu29aUNRMheZeI0vE";

async function verifyKeys() {
    console.log("--- Testing ANON KEY ---");
    const clientAnon = createClient(SUPABASE_URL, ANON_KEY);
    const resAnon = await clientAnon.from('videos').select('count').limit(1);
    console.log("ANON result:", resAnon.error ? resAnon.error.message : "SUCCESS!");

    console.log("--- Testing SERVICE ROLE KEY ---");
    const clientService = createClient(SUPABASE_URL, SERVICE_KEY);
    const resService = await clientService.from('videos').select('count').limit(1);
    console.log("SERVICE result:", resService.error ? resService.error.message : "SUCCESS!");
}

verifyKeys();
