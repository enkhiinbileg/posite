"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [data, setData] = useState<any>(null);

    const log = (msg: string) => setLogs(p => [...p, `${new Date().toISOString().split('T')[1]} - ${msg}`]);

    useEffect(() => {
        async function runChecks() {
            log("Starting Checks...");

            try {
                // 1. Check Auth
                const { data: { session }, error: authError } = await supabase.auth.getSession();
                if (authError) log("Auth Error: " + authError.message);
                log("Session: " + (session ? "Logged In" : "Guest"));

                // 2. Check Webtoons RLS
                log("Fetching Webtoons...");
                const { data: webtoons, error: wError, count: wCount } = await supabase
                    .from('webtoons')
                    .select('id, title, genres', { count: 'exact' })
                    .limit(5);

                if (wError) {
                    log("Webtoons Fetch Error: " + wError.message);
                    log("Hint: RLS policy might be blocking select.");
                } else {
                    log(`Webtoons Found: ${wCount} (showing ${webtoons?.length})`);
                    if (webtoons?.length === 0) log("WARNING: Webtoons array is empty but no error.");
                }

                // 3. Check Homepage Sections
                log("Fetching Homepage Sections...");
                const { data: sections, error: sError } = await supabase
                    .from('homepage_sections')
                    .select('*');

                if (sError) {
                    log("Sections Fetch Error: " + sError.message);
                } else {
                    log(`Sections Found: ${sections?.length}`);
                }

                // 4. Check Chapters relation
                if (webtoons && webtoons.length > 0) {
                    const firstId = webtoons[0].id;
                    log(`Checking chapters for webtoon ${firstId}...`);
                    const { data: chapters, error: cError } = await supabase
                        .from('chapters')
                        .select('id')
                        .eq('webtoon_id', firstId);

                    if (cError) log("Chapters Fetch Error: " + cError.message);
                    else log(`Chapters found: ${chapters?.length}`);
                }

                setData({ webtoons, sections });

            } catch (e: any) {
                log("CRITICAL EXCEPTION: " + e.message);
            }

            log("Checks Complete.");
        }

        runChecks();
    }, []);

    return (
        <div className="min-h-screen bg-black text-green-400 font-mono p-4 text-xs md:text-sm overflow-auto">
            <h1 className="text-xl font-bold text-white mb-4">Network & Data Debugger</h1>
            <div className="space-y-1 mb-8">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            {data && (
                <div className="space-y-4">
                    <details>
                        <summary className="cursor-pointer text-white font-bold">Raw Webtoons Data (First 5)</summary>
                        <pre className="mt-2 p-2 bg-gray-900 rounded overflow-auto max-h-60">
                            {JSON.stringify(data.webtoons, null, 2)}
                        </pre>
                    </details>
                    <details>
                        <summary className="cursor-pointer text-white font-bold">Raw Sections Data</summary>
                        <pre className="mt-2 p-2 bg-gray-900 rounded overflow-auto max-h-60">
                            {JSON.stringify(data.sections, null, 2)}
                        </pre>
                    </details>
                </div>
            )}

            <button
                onClick={() => window.location.reload()}
                className="fixed bottom-4 right-4 bg-white text-black px-4 py-2 rounded font-bold"
            >
                RELOAD
            </button>
        </div>
    );
}
