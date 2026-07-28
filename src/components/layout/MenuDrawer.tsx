"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Home, History, Settings, LibraryBig, Languages, 
    LogOut, ChevronRight, X, Crown, User, Calendar, Film
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function MenuDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { user, profile, refreshProfile } = useAuth();

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('openMenu', handleOpen);
        return () => window.removeEventListener('openMenu', handleOpen);
    }, []);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch (e) {
            console.warn("Signout error:", e);
        } finally {
            setIsOpen(false);
            window.location.href = "/";
        }
    };

    const handleLinkClick = (href: string) => {
        setIsOpen(false);
        router.push(href);
    };

    if (!user) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div 
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[101] bg-[#0A0A0A] border-t border-white/10 rounded-t-[40px] transition-transform duration-500 ease-out lg:hidden h-[75%] flex flex-col",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                {/* Drag Handle & Close */}
                <div className="flex flex-col items-center pt-3 pb-2 sticky top-0 bg-[#0A0A0A] z-10 rounded-t-[40px]">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full mb-4" onClick={() => setIsOpen(false)} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-none">
                    <div className="space-y-8">
                        {/* Profile Section */}
                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/20">
                                <img src={user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-black text-white truncate uppercase tracking-tighter">
                                    {user.user_metadata.full_name || user.email?.split('@')[0]}
                                </h2>
                                <p className="text-[10px] text-muted truncate">{user.email}</p>
                                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Level {Math.floor((profile?.xp || 0) / 1000)}</span>
                                </div>
                            </div>
                        </div>

                        {/* VIP Quick Access */}
                        {(() => {
                            const isRegularVip = profile?.is_vip && (!profile?.vip_expiration || new Date(profile.vip_expiration) > new Date());
                            const isNsfwVip = profile?.nsfw_vip_expiration && new Date(profile.nsfw_vip_expiration) > new Date();
                            const anyVip = isRegularVip || isNsfwVip;

                            return (
                                <div className={cn(
                                    "p-5 rounded-3xl border transition-all relative overflow-hidden",
                                    anyVip 
                                        ? (isNsfwVip ? "bg-rose-500/10 border-rose-500/20" : "bg-yellow-500/10 border-yellow-500/20")
                                        : "bg-white/5 border-white/10"
                                )}>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-3">
                                                {(isRegularVip || !anyVip) && (
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                                                        isRegularVip ? "bg-yellow-500/20 border-yellow-500/50" : "bg-white/10 border-white/20"
                                                    )}>
                                                        <Crown className={cn("w-5 h-5", isRegularVip ? "text-yellow-500 fill-yellow-500" : "text-muted")} />
                                                    </div>
                                                )}
                                                {isNsfwVip && (
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-rose-500/20 border-rose-500/50 shadow-xl">
                                                        <Crown className="w-5 h-5 text-rose-500 fill-rose-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={cn("text-xs font-black uppercase tracking-widest", anyVip ? "text-yellow-500" : "text-white")}>
                                                    VIP Гишүүнчлэл
                                                </h3>
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase">
                                                    {anyVip ? "Идэвхтэй" : "Идэвхгүй"}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleLinkClick('/vip')}
                                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[9px] font-black text-white uppercase tracking-widest transition-all"
                                        >
                                            {anyVip ? "Сунгах" : "Авах"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Navigation List */}
                        <div className="space-y-4">
                            <h3 className="px-1 text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em]">Ерөнхий</h3>
                            <div className="space-y-1">
                                <MenuButton icon={Home} label="Нүүр хуудас" onClick={() => handleLinkClick('/home')} />
                                <MenuButton icon={LibraryBig} label="Бүх вэбтүүн" onClick={() => handleLinkClick('/webtoon')} />
                                <MenuButton icon={Calendar} label="Хуваарь" onClick={() => handleLinkClick('/schedule')} />
                                <MenuButton icon={Film} label="Видео сан" onClick={() => handleLinkClick('/videos')} />
                                <MenuButton icon={History} label="Уншсан түүх" onClick={() => handleLinkClick('/library?tab=history')} />
                                <MenuButton icon={Settings} label="Тохиргоо" onClick={() => handleLinkClick('/profile?tab=settings')} />
                            </div>
                        </div>

                        {/* Admin/Special */}
                        {(profile?.is_admin || profile?.is_moderator) && (
                            <div className="space-y-4">
                                <h3 className="px-1 text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em]">Удирдах</h3>
                                <div className="space-y-1">
                                    {(profile?.is_admin || profile?.is_moderator) && <MenuButton icon={Languages} label="Translator Panel" color="text-purple-500" onClick={() => handleLinkClick('/translator/dashboard')} />}
                                </div>
                            </div>
                        )}

                        {/* Sign Out */}
                        <div className="pt-4">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-3 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                            >
                                <LogOut className="w-4 h-4" />
                                Гарах
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function MenuButton({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color?: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group",
                color || "text-zinc-300"
            )}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 group-active:scale-90 transition-transform">
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold uppercase tracking-tight">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
        </button>
    );
}
