"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function ReferralTracker() {
    const searchParams = useSearchParams();

    // 1. Capture referral code from URL
    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) {
            // Store referral code in localStorage for 30 days
            const expiry = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
            localStorage.setItem('referred_by_code', JSON.stringify({
                code: ref,
                expires: expiry
            }));

            // Increment click count for this YouTuber (Async)
            incrementClicks(ref);

            console.log('Referral tracked:', ref);
        }
    }, [searchParams]);

    async function incrementClicks(code: string) {
        try {
            // Find YouTuber and increment referral_clicks
            // Note: We use a RPC or standard increment if available, 
            // but since we don't have a specific RPC, we fetch and update.
            // In high traffic, a Postgres function would be better.
            const { data: youtuber } = await supabase
                .from('profiles')
                .select('id, referral_clicks')
                .eq('referral_code', code)
                .single();

            if (youtuber) {
                await supabase
                    .from('profiles')
                    .update({ referral_clicks: (youtuber.referral_clicks || 0) + 1 })
                    .eq('id', youtuber.id);
            }
        } catch (err) {
            console.error('Click tracking error:', err);
        }
    }

    // 2. Attribute referral to user profile when logged in
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const stored = localStorage.getItem('referred_by_code');
                if (!stored) return;

                try {
                    const { code, expires } = JSON.parse(stored);

                    // Check if expired
                    if (new Date().getTime() > expires) {
                        localStorage.removeItem('referred_by_code');
                        return;
                    }

                    // 1. Check if user already has a referrer to avoid overwriting
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('referred_by')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.warn('Silent: Referral profile check failed');
                        return;
                    }

                    if (profile && !profile.referred_by) {
                        // 2. Find YouTuber ID by code
                        const { data: youtuber } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('referral_code', code)
                            .single();

                        if (youtuber && youtuber.id !== session.user.id) {
                            // 3. Update user profile
                            const { error: updateError } = await supabase
                                .from('profiles')
                                .update({ referred_by: youtuber.id })
                                .eq('id', session.user.id);

                            if (!updateError) {
                                console.log('Successfully attributed to YouTuber:', code);
                                localStorage.removeItem('referred_by_code');
                            }
                        }
                    } else if (profile?.referred_by) {
                        // Already referred, just clean up
                        localStorage.removeItem('referred_by_code');
                    }
                } catch (err) {
                    console.error('Referral attribution error:', err);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return null;
}
