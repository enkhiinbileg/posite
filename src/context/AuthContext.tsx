"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    profile: any | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const userRef = React.useRef<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const [lastFetchTime, setLastFetchTime] = useState<number>(0);
    const FETCH_COOLDOWN = 2000; // 2 seconds
    const fetchProfileRef = React.useRef<Promise<void> | null>(null);

    const fetchProfile = async (userId: string, arg2?: string | AbortSignal, arg3?: AbortSignal) => {
        if (!userId) return;

        let accessToken: string | undefined = typeof arg2 === 'string' ? arg2 : undefined;
        let signal: AbortSignal | undefined = arg2 instanceof AbortSignal ? arg2 : arg3;

        const now = Date.now();
        if (profile && (now - lastFetchTime < FETCH_COOLDOWN)) return;

        try {
            // 1. Try direct database fetch first (1 hop, fast)
            let profileData: any = null;
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                if (!error && data) {
                    profileData = data;
                }
            } catch (e: any) {
                console.warn("AuthContext direct profiles fetch error:", e?.message);
            }

            // 2. Fallback to /api/me using service role if direct fetch failed
            if (!profileData) {
                try {
                    if (!accessToken) {
                        const { data: sessionData } = await supabase.auth.getSession();
                        accessToken = sessionData?.session?.access_token;
                    }
                    if (accessToken) {
                        const response = await fetch(`/api/me?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            signal,
                            cache: 'no-store'
                        });
                        if (response.ok) {
                            const data = await response.json();
                            if (data && !data.error) {
                                profileData = data;
                            }
                        }
                    }
                } catch (e: any) {
                    console.warn("AuthContext /api/me fetch error:", e?.message);
                }
            }

            // 3. Fallback to basic user info if profile database entry is missing/loading
            if (!profileData && userRef.current) {
                const u = userRef.current;
                profileData = {
                    id: u.id,
                    email: u.email,
                    full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
                    avatar_url: u.user_metadata?.avatar_url || null,
                    role: 'user',
                    coins: 0,
                };
            }

            if (profileData) {
                setProfile(profileData);
                setLastFetchTime(Date.now());
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
            console.error('fetchProfile error:', err);
        }
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                let { data: { session } } = await supabase.auth.getSession();
                
                // Fallback re-hydration from localStorage for Google Search App and Mobile WebViews
                if (!session && typeof window !== 'undefined') {
                    try {
                        const stored = localStorage.getItem('sb-kcdzmijmgjljbhcefp-auth-token') || localStorage.getItem('sb-jtlwllzaxscxqtcoqpll-auth-token');
                        if (stored) {
                            const parsed = typeof stored === 'string' && stored.startsWith('{') ? JSON.parse(stored) : null;
                            if (parsed?.access_token && parsed?.refresh_token) {
                                const { data: setRes } = await supabase.auth.setSession({
                                    access_token: parsed.access_token,
                                    refresh_token: parsed.refresh_token,
                                });
                                session = setRes.session;
                            }
                        }
                    } catch (e) {}
                }

                if (!isMounted) return;
                if (session?.user) {
                    setUser(session.user);
                    userRef.current = session.user;
                    await fetchProfile(session.user.id);
                }
            } catch (err: any) {
                // Ignore initial auth error
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            const currentUser = session?.user || null;
            
            if (currentUser) {
                setUser(currentUser);
                userRef.current = currentUser;
                fetchProfile(currentUser.id);
                
                if (event === 'SIGNED_IN') {
                    const currentPath = window.location.pathname;
                    if ((currentPath === '/' || currentPath.startsWith('/auth')) && currentPath !== '/home') {
                        window.location.replace('/home');
                    }
                } else if (event === 'PASSWORD_RECOVERY') {
                    window.location.href = '/update-password';
                }
            } else if (event === 'SIGNED_OUT') {
                const wasLoggedIn = !!userRef.current;
                setUser(null);
                userRef.current = null;
                setProfile(null);
                sessionStorage.removeItem('auth_reloaded');
                if (wasLoggedIn && typeof window !== 'undefined' && window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            } else {
                setUser(null);
                userRef.current = null;
                setProfile(null);
            }
            
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
