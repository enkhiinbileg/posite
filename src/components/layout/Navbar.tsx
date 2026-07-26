"use client";

import { Search, Bell, User, LogOut, Medal, Crown, Settings, Youtube, Languages, Users, Flame, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SearchOverlay } from "./SearchOverlay";
import { NotificationOverlay } from "./NotificationOverlay";
import { MilestonePopup } from "../ui/MilestonePopup";
import { AuthModal } from "../auth/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function Navbar() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    // const [session, setSession] = useState<Session | null>(null); // Replaced by useAuth
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [isYouTuber, setIsYouTuber] = useState(false);
    const [isTranslator, setIsTranslator] = useState(false);
    const [isVip, setIsVip] = useState(false);
    const [isNsfwVip, setIsNsfwVip] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [strikeCount, setStrikeCount] = useState(0);
    const [freezeCount, setFreezeCount] = useState(0);
    const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const lastStrikeRef = useRef<number>(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (user) {
            checkUserDailyStrike(user.id);
            fetchUnreadCount(user.id);
            syncProfileToLocalState(profile);
        } else {
            setIsAdmin(false);
            setIsModerator(false);
            setIsYouTuber(false);
            setIsTranslator(false);
            setIsVip(false);
            setIsNsfwVip(false);
            setUnreadCount(0);
            setUserAvatar(null);
        }
    }, [user, profile]);

    useEffect(() => {
        if (user) {
            // Real-time listener for unread count
            const channel = supabase
                .channel('navbar_unread_count')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    () => fetchUnreadCount(user.id)
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.id]);

    useEffect(() => {
        const handleRefresh = () => {
            if (user) {
                fetchUnreadCount(user.id);
            }
        };
        const handleOpenNotifications = () => setIsNotificationOpen(true);
        const handleOpenAuth = () => setIsAuthModalOpen(true);

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                window.dispatchEvent(new Event('openSearch'));
            }
        };

        window.addEventListener('refreshNotifications', handleRefresh);
        window.addEventListener('openNotifications', handleOpenNotifications);
        window.addEventListener('openAuth', handleOpenAuth);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('refreshNotifications', handleRefresh);
            window.removeEventListener('openNotifications', handleOpenNotifications);
            window.removeEventListener('openAuth', handleOpenAuth);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [user]);

    const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

    async function fetchUnreadCount(userId: string) {
        if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);

        // Debounce by 2 seconds to prevent rapid real-time spikes
        fetchTimerRef.current = setTimeout(async () => {
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('is_read', false);

                if (!error) setUnreadCount(count || 0);
            } catch (err) {
                console.warn('Silent: Error fetching unread count');
            }
        }, 2000);
    }

    async function checkUserDailyStrike(userId: string) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastCheckIn = localStorage.getItem(`daily_strike_check_${userId}`);

            if (lastCheckIn !== today) {
                await supabase.rpc('check_in_strike');
                localStorage.setItem(`daily_strike_check_${userId}`, today);
                await refreshProfile();
            }
        } catch (err) {
            console.warn('Silent: Error checking strike');
        }
    }

    function syncProfileToLocalState(data: any) {
        if (!data) return;

        setIsAdmin(data.is_admin || false);
        setIsModerator(data.is_moderator || false);
        setIsYouTuber(data.is_youtuber || false);
        setIsTranslator(data.is_translator || false);
        setUserAvatar(data.avatar_url);

        let validVip = data.is_vip || false;
        if (validVip && data.vip_expiration) {
            const expiresAt = new Date(data.vip_expiration);
            if (expiresAt < new Date()) {
                validVip = false;
            }
        }
        setIsVip(validVip);

        // NSFW VIP logic
        let validNsfwVip = false;
        if (data.nsfw_vip_expiration) {
            const expiresAt = new Date(data.nsfw_vip_expiration);
            if (expiresAt > new Date()) {
                validNsfwVip = true;
            }
        }
        setIsNsfwVip(validNsfwVip);
        setStrikeCount(data.current_strike || 0);
        setFreezeCount(data.strike_freezes || 0);

        const newStrike = data.current_strike || 0;
        if (newStrike > 0 && newStrike !== lastStrikeRef.current) {
            if (newStrike === 7 || newStrike === 30 || newStrike === 100 || (newStrike > 0 && newStrike % 50 === 0)) {
                setIsMilestoneOpen(true);
            }
            lastStrikeRef.current = newStrike;
        }
    }

    useEffect(() => {
        /* DISABLED FOR PERFORMANCE - CAUSING DB LOCKS
        if (!session) return;
    
        console.log('[Navbar] Subscribing to global-presence...');
        const channel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: session.user.id,
                },
            },
        });
    
        channel
            .on('presence', { event: 'sync' }, () => {
                console.log('[Navbar] Presence sync triggered');
            })
            .subscribe(async (status) => {
                console.log('[Navbar] Presence status:', status);
                if (status === 'SUBSCRIBED') {
                    // Fetch profile if not available
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', session.user.id)
                        .single();
    
                    await channel.track({
                        user_id: session.user.id,
                        full_name: profile?.full_name || session.user.email,
                        avatar_url: profile?.avatar_url,
                        online_at: new Date().toISOString()
                    });
                    console.log('[Navbar] User tracked in global-presence');
                }
            });
    
        return () => {
            console.log('[Navbar] Unsubscribing from global-presence');
            channel.unsubscribe();
        };
        */
    }, [user]);

    const handleSignOut = async () => {
        try {
            // First clear client-side Supabase state (optional but cleaner)
            await supabase.auth.signOut();
            
            // Call the server-side logout to purge cookies definitely
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch (e) {
            console.warn("Server-side signout failed, fallback to local", e);
        } finally {
            // Ensure session flag is cleared for AuthContext
            sessionStorage.removeItem('auth_reloaded');
            
            // Redirect to landing page explicitly with hard reload
            window.location.href = '/';
        }
    };

    // Hide Navbar on Reader Page, Webtoon Detail Page, and Webtoon Browse Page
    const isReaderPage = pathname?.includes('/read/');
    const isDetailPage = pathname?.match(/^\/webtoon\/[\w-]+$/);
    const isWebtoonBrowsePage = pathname === '/webtoon' || pathname === '/webtoon/';

    if (isReaderPage || isDetailPage || isWebtoonBrowsePage) {
        return null; // Return null early before rendering anything
    }

    return (
        <>
            <NotificationOverlay isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
            <MilestonePopup isOpen={isMilestoneOpen} onClose={() => setIsMilestoneOpen(false)} strikeCount={strikeCount} />

            <header className={cn(
                "fixed top-0 z-50 w-full lg:w-[calc(100%-6rem)] lg:left-24 transition-all duration-500 px-2 sm:px-4 lg:px-12 py-2 lg:py-5",
                scrolled ? "bg-black/98 backdrop-blur-sm shadow-2xl" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
            )}>
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo Section */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-8 h-8 lg:w-10 lg:h-10 transition-transform group-hover:scale-105">
                                <img
                                    src="/logo.png?v=6"
                                    alt="MyToon Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="hidden sm:inline font-black text-xl lg:text-2xl tracking-tighter uppercase italic text-white group-hover:text-primary transition-colors">MyToon</span>
                        </Link>

                        {/* Navigation Links */}
                        <nav className="hidden lg:flex items-center gap-8">
                            <Link href="/schedule" className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-white transition-all flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Хуваарь
                            </Link>
                        </nav>
                    </div>

                    {/* Right Section: Stats & Profile */}
                    <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
                        {/* Search Trigger */}
                        <button
                            onClick={() => window.dispatchEvent(new Event('openSearch'))}
                            aria-label="Хайлт нээх (⌘K)"
                            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group relative"
                        >
                            <Search className="w-5 h-5" />
                            {/* Keyboard Hint */}
                            <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/50">
                                <span>⌘</span>
                                <span>K</span>
                            </div>
                        </button>

                        {(isAdmin || isModerator || isYouTuber) && (
                            <Link
                                href="/admin"
                                className={cn(
                                    "flex px-3 py-1.5 lg:px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                                    isAdmin
                                        ? "bg-primary/10 text-primary hover:bg-primary hover:text-white border-primary/20"
                                        : isModerator
                                            ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border-blue-500/20"
                                            : "bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white border-red-600/20"
                                )}
                            >
                                {isAdmin ? "Admin" : isModerator ? "Panel" : "Star"}
                            </Link>
                        )}

                        {user ? (
                            <div className="flex items-center gap-6">
                                {/* Strike Count */}
                                {strikeCount > 0 && (
                                    <Link
                                        href="/help/strike"
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-full border group cursor-pointer animate-pop-in hover:scale-105 transition-all",
                                            strikeCount >= 30
                                                ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:border-yellow-500/50"
                                                : strikeCount >= 7
                                                    ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:border-blue-500/50"
                                                    : "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40"
                                        )} title={`${strikeCount} өдөр дараалан идэвхтэй. Заавар үзэх`}
                                    >
                                        <span className={cn(
                                            "font-black text-sm animate-pulse-slow",
                                            strikeCount >= 30 ? "text-yellow-500" : strikeCount >= 7 ? "text-blue-500" : "text-orange-500"
                                        )}>
                                            {strikeCount >= 30 ? "💎" : strikeCount >= 7 ? "⚡" : "🔥"}
                                        </span>
                                        <span className={cn(
                                            "font-black text-xs",
                                            strikeCount >= 30 ? "text-yellow-500" : strikeCount >= 7 ? "text-blue-400" : "text-orange-500"
                                        )}>{strikeCount}</span>
                                    </Link>
                                )}

                                {/* Notifications Toggle */}
                                <button
                                    onClick={() => setIsNotificationOpen(true)}
                                    aria-label={`Мэдэгдэл (${unreadCount} шинэ)`}
                                    className="relative text-white/70 hover:text-white transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-[8px] font-black text-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </div>
                                    )}
                                </button>

                                {/* Strike Freeze Count - Hidden on mobile */}
                                {freezeCount > 0 && (
                                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 group cursor-help animate-pop-in" title={`${freezeCount} хөлдөөгч байгаа`}>
                                        <span className="text-blue-500 font-black text-sm">🧊</span>
                                        <span className="text-blue-400 font-black text-xs">{freezeCount}</span>
                                    </div>
                                )}

                                {/* Profile Dropdown */}
                                <div className="relative group">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        aria-label="Профайл цэс"
                                        className="flex items-center gap-3 group/btn"
                                    >
                                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg border-2 border-transparent group-hover/btn:border-primary transition-all overflow-hidden">
                                            <img
                                                src={userAvatar || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'user')}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="hidden lg:block text-left">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-black text-white">{user?.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                                                {isVip && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                {isNsfwVip && <Crown className="w-3 h-3 text-rose-500 fill-rose-500" />}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Dropdown Menu */}
                                    <div className={cn(
                                        "absolute right-0 top-full mt-2 w-64 bg-surface border border-white/10 rounded-2xl shadow-2xl transition-all duration-200 overflow-hidden z-50",
                                        isProfileOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-2 lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:translate-y-0"
                                    )}>
                                        <div className="p-4 border-b border-white/5">
                                            <p className="text-sm font-bold text-white truncate">{user?.user_metadata?.full_name || user.email}</p>
                                            <p className="text-xs text-muted truncate">{user.email}</p>
                                        </div>

                                        <div className="p-2">
                                            <Link
                                                href="/profile"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group/item"
                                            >
                                                <User className="w-4 h-4 text-muted group-hover/item:text-white" />
                                                <span className="text-sm font-medium text-white">Профайл</span>
                                            </Link>

                                            {/* VIP Statuses */}
                                            {isVip && (
                                                <Link
                                                    href="/vip"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-500/10 transition-colors group/item"
                                                >
                                                    <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium text-yellow-500">VIP Гишүүн</span>
                                                </Link>
                                            )}
                                            {isNsfwVip && (
                                                <Link
                                                    href="/vip"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-colors group/item"
                                                >
                                                    <Crown className="w-4 h-4 text-rose-500 fill-rose-500" />
                                                    <span className="text-sm font-medium text-rose-500">18+ VIP Гишүүн</span>
                                                </Link>
                                            )}
                                            {!isVip && !isNsfwVip && (
                                                <Link
                                                    href="/vip"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-500/10 transition-colors group/item"
                                                >
                                                    <Crown className="w-4 h-4 text-muted group-hover/item:text-yellow-500" />
                                                    <span className="text-sm font-medium text-muted group-hover/item:text-yellow-500">VIP эрх авах</span>
                                                </Link>
                                            )}

                                            <Link
                                                href={isYouTuber ? "/admin/youtuber" : "/partner/apply"}
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-600/10 transition-colors group/partner"
                                            >
                                                <Youtube className={cn(
                                                    "w-4 h-4 transition-colors",
                                                    isYouTuber ? "text-red-600" : "text-muted group-hover/partner:text-red-600"
                                                )} />
                                                <span className={cn(
                                                    "text-sm font-medium transition-colors",
                                                    isYouTuber ? "text-red-600" : "text-white"
                                                )}>
                                                    {isYouTuber ? "Partner Dashboard" : "Partner Program"}
                                                </span>
                                            </Link>

                                            {isTranslator && (
                                                <Link
                                                    href="/translator/dashboard"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-600/10 transition-colors group/translator"
                                                >
                                                    <Languages className="w-4 h-4 text-purple-500" />
                                                    <span className="text-sm font-medium text-purple-500">
                                                        Орчуулагчийн Самбар
                                                    </span>
                                                </Link>
                                            )}

                                            {(isTranslator || isYouTuber || isAdmin) && (
                                                <Link
                                                    href="/community"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group/item"
                                                >
                                                    <Users className="w-4 h-4 text-muted group-hover/item:text-white" />
                                                    <span className="text-sm font-medium text-white">Community Chat</span>
                                                </Link>
                                            )}

                                            <Link
                                                href="/profile?tab=settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group/item"
                                            >
                                                <Settings className="w-4 h-4 text-muted group-hover/item:text-white" />
                                                <span className="text-sm font-medium text-white">Тохиргоо</span>
                                            </Link>
                                        </div>

                                        <div className="p-2 border-t border-white/5">
                                            <button
                                                onClick={handleSignOut}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors group/item w-full"
                                            >
                                                <LogOut className="w-4 h-4 text-muted group-hover/item:text-red-500" />
                                                <span className="text-sm font-medium text-muted group-hover/item:text-red-500">Гарах</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="px-5 lg:px-6 py-1.5 lg:py-2 bg-primary text-white rounded-lg text-[10px] lg:text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all uppercase tracking-widest cursor-pointer"
                            >
                                Нэвтрэх
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />
        </>
    );
}
