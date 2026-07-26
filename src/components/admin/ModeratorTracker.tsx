'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export function ModeratorTracker() {
    const [isModerator, setIsModerator] = useState(false);
    const [isActive, setIsActive] = useState(false); // Was there activity in this window?
    const activityRef = useRef<boolean>(false);
    const pathname = usePathname();

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_moderator, is_admin')
                .eq('id', user.id)
                .single();

            if (profile?.is_moderator || profile?.is_admin) {
                setIsModerator(true);
                startTracking();
            }
        } catch (err) {
            console.warn('Silent: Moderator permission check failed');
        }
    };

    const startTracking = () => {
        // 1. Activity Listeners
        const handleActivity = () => {
            activityRef.current = true;
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // 2. Ping Loop (Every 60 seconds)
        const PING_INTERVAL = 60000;

        const interval = setInterval(async () => {
            // Only ping if there was activity in the last interval OR page just loaded
            // We'll be lenient: If activityRef is true, we count this minute.
            if (activityRef.current) {
                await sendPing();
                activityRef.current = false; // Reset for next minute
            }
        }, PING_INTERVAL);

        // Initial ping on load (optional, or wait for first activity)
        // Let's wait for first activity to strictly follow "doing something"

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            clearInterval(interval);
        };
    };

    const sendPing = async () => {
        try {
            await supabase.rpc('ping_moderator');
            // console.log('Work tracked: +1 min');
        } catch (e) {
            console.error('Ping failed', e);
        }
    };

    // Render nothing (utility component)
    return null;
}
