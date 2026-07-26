"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        // HARD FAILSAFE TIMEOUT: Under NO circumstances should anyone stay on /auth/callback for more than 1.5 seconds!
        const forceRedirectTimer = setTimeout(() => {
            if (isMounted) {
                console.warn("[AuthCallback] Hard failsafe timeout reached (1.5s), force redirecting to /home");
                window.location.replace('/home');
            }
        }, 1500);

        const isAbortError = (err: any) => {
            const msg = String(err?.message || err || '').toLowerCase();
            const name = String(err?.name || '').toLowerCase();
            return name === 'aborterror' || 
                   msg.includes('aborted') || 
                   msg.includes('abort') || 
                   msg.includes('signal is aborted') ||
                   msg.includes('load failed') ||
                   msg.includes('failed to fetch');
        };

        const handleAuthCallback = async () => {
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
            const code = urlParams.get('code');
            const next = urlParams.get('next') || '/home';

            try {
                // 1. Check if session is already active
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session) {
                    clearTimeout(forceRedirectTimer);
                    if (isMounted) window.location.replace(next);
                    return;
                }

                // 2. If code in search params, exchange code for session on client
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (data?.session) {
                        // Persist session into localStorage & cookies to guarantee Google App / Mobile WebViews never lose it
                        try {
                            const sessionStr = JSON.stringify(data.session);
                            localStorage.setItem('sb-jtlwllzaxscxqtcoqpll-auth-token', sessionStr);
                            document.cookie = `sb-jtlwllzaxscxqtcoqpll-auth-token=${encodeURIComponent(sessionStr)}; path=/; max-age=31536000; SameSite=Lax`;
                        } catch (e) {}

                        await supabase.auth.setSession(data.session);
                        clearTimeout(forceRedirectTimer);
                        if (isMounted) window.location.replace(next);
                        return;
                    } else if (error) {
                        if (isAbortError(error)) {
                            clearTimeout(forceRedirectTimer);
                            if (isMounted) window.location.replace(next);
                            return;
                        }

                        console.warn("[AuthCallback] Code exchange warning:", error.message);
                        
                        // Check if session exists anyway (retry check)
                        const { data: retryData } = await supabase.auth.getSession();
                        if (retryData?.session) {
                            clearTimeout(forceRedirectTimer);
                            if (isMounted) window.location.replace(next);
                            return;
                        }

                        clearTimeout(forceRedirectTimer);
                        if (isMounted) window.location.replace(next);
                        return;
                    }
                }

                // If no code and no session, redirect to home immediately
                clearTimeout(forceRedirectTimer);
                if (isMounted) window.location.replace(next);

            } catch (err: any) {
                clearTimeout(forceRedirectTimer);
                if (isAbortError(err)) {
                    if (isMounted) window.location.replace(next);
                    return;
                }
                console.error("[AuthCallback] Exception:", err);
                if (isMounted) window.location.replace(next);
            }
        };

        handleAuthCallback();

        return () => {
            isMounted = false;
            clearTimeout(forceRedirectTimer);
        };
    }, []);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-montserrat">
            <div className="text-center space-y-6 max-w-md w-full">
                {errorMsg ? (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-xs font-bold animate-in fade-in space-y-4">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div>
                            <p className="font-black text-sm text-white mb-1 uppercase tracking-wide">Нэвтрэх Алдаа</p>
                            <p className="text-white/70 font-mono text-[11px] break-words">{errorMsg}</p>
                        </div>
                        <button
                            onClick={() => window.location.replace('/home')}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            Дахин оролдох (Буцах)
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60 animate-pulse">
                            БҮРТГЭЛИЙГ БАТАЛГААЖУУЛЖ БАЙНА...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
