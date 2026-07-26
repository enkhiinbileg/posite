"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Crown, Star, Loader2, ArrowLeft, TrendingUp, User as UserIcon, LogIn, ChevronRight, Globe, Calendar, MapPin, Search, Zap, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getLevelData, RANKS } from "@/lib/leveling";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RanksGuide } from "@/components/leaderboard/RanksGuide";
import { useAuth } from "@/context/AuthContext";

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // const [user, setUser] = useState<any>(null); // Replaced by useAuth
    const [userRank, setUserRank] = useState<number | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"all_time" | "monthly" | "weekly">("all_time");
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            let data: any[] = [];
            let error: any = null;

            if (activeTab === "all_time") {
                // All Time: Simple profile query
                const { data: leaderData, error: leaderError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, xp, username')
                    .order('xp', { ascending: false })
                    .limit(100);
                data = leaderData || [];
                error = leaderError;
            } else {
                // Weekly/Monthly: RPC call
                const days = activeTab === "weekly" ? 7 : 30;
                const { data: leaderData, error: leaderError } = await supabase
                    .rpc('get_time_based_leaderboard', { interval_days: days });
                data = leaderData || [];
                error = leaderError;
            }

            if (!error) {
                setTopUsers(data);
            }

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                setUserProfile(profile);

                if (profile) {
                    const { count } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .gt('xp', profile.xp || 0);

                    setUserRank((count || 0) + 1);
                }
            } else {
                setUserProfile(null);
                setUserRank(null);
            }
            setLoading(false);
        }
        fetchData();
    }, [activeTab, user]);

    const tabs = [
        { id: "all_time", name: "Бүх цаг үе", icon: Globe },
        { id: "monthly", name: "Энэ сар", icon: Calendar },
        { id: "weekly", name: "Энэ долоо хоног", icon: Zap },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-primary relative overflow-hidden flex flex-col md:flex-row">
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-[#050505] z-[200]"
                    >
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            {/* HERO ART (LEFT SIDE) */}
            <div className="hidden md:block w-[40%] h-screen relative border-r border-white/5 overflow-hidden">
                <img
                    src="/leaderboard_hero_final.png"
                    className="w-full h-full object-cover opacity-80"
                    alt="Leaderboard Hero"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505]" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]" />

                <div className="absolute bottom-20 left-12 space-y-2">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-3 px-4 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase italic tracking-widest shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]"
                    >
                        <Crown className="w-4 h-4" />
                        Top Reader Active
                    </motion.div>
                    <motion.h2
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-6xl font-black uppercase italic tracking-tighter leading-none"
                    >
                        S-RANK <br />
                        <span className="text-primary">HEROES</span>
                    </motion.h2>
                </div>
            </div>

            {/* RANKING LIST (RIGHT SIDE) */}
            <div className="flex-1 h-screen overflow-y-auto relative bg-[#050505] custom-scrollbar pb-safe">
                {/* Mobile Header Banner */}
                <div className="md:hidden w-full h-64 relative overflow-hidden">
                    <img
                        src="/leaderboard_hero_final.png"
                        className="w-full h-full object-cover opacity-60 scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
                    <div className="absolute bottom-8 left-6 right-6 flex flex-col items-center text-center">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1 rounded-full mb-3"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Season Ranking</p>
                        </motion.div>
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl font-black uppercase tracking-tighter italic"
                        >
                            LEADERBOARDS
                        </motion.h1>
                    </div>
                </div>

                {/* Navigation Bar */}
                <div className="sticky top-0 z-[50] bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-4 md:px-6 py-3 md:py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "text-primary bg-primary/10 border-b-2 border-primary"
                                            : "text-muted hover:text-white"
                                    )}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <button
                                onClick={() => setIsGuideOpen(true)}
                                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center gap-2 px-3"
                            >
                                <Info className="w-5 h-5" />
                                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Цолнууд</span>
                            </button>
                            <button className="p-2 rounded-lg hover:bg-white/5 text-muted transition-all">
                                <Search className="w-5 h-5 md:w-5 md:h-5" />
                            </button>
                            <Link href="/" className="p-2 rounded-lg hover:bg-white/5 text-muted transition-all">
                                <ArrowLeft className="w-5 h-5 md:w-5 md:h-5" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* List Container */}
                <div className="p-2 md:p-8 space-y-2 md:space-y-3 pb-48">
                    <div className="grid grid-cols-12 px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        <div className="col-span-2">Rank</div>
                        <div className="col-span-10 sm:col-span-7">Player</div>
                        <div className="hidden sm:block col-span-3 text-right">XP Power</div>
                    </div>

                    <AnimatePresence>
                        {topUsers.length > 0 ? (
                            topUsers.map((profile, index) => {
                                const rank = index + 1;
                                const levelData = getLevelData(profile.xp || 0);
                                return (
                                    <motion.div
                                        key={profile.id}
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={cn(
                                            "grid grid-cols-12 items-center px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all duration-300 group",
                                            rank === 1 ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30" :
                                                rank === 2 ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/20" :
                                                    rank === 3 ? "bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/20" :
                                                        "bg-[#0a0a0a]/50 border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                        )}
                                    >
                                        {/* Rank Column */}
                                        <div className="col-span-2 flex items-center justify-start translate-x-[-4px] md:translate-x-0">
                                            {rank === 1 ? (
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-yellow-500 flex items-center justify-center text-black font-black italic shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                                                    1
                                                </div>
                                            ) : rank === 2 ? (
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-400 flex items-center justify-center text-black font-black italic shadow-[0_0_20px_rgba(148,163,184,0.3)]">
                                                    2
                                                </div>
                                            ) : rank === 3 ? (
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-700 flex items-center justify-center text-white font-black italic shadow-[0_0_20px_rgba(180,83,9,0.3)]">
                                                    3
                                                </div>
                                            ) : (
                                                <div className="w-8 md:w-10 text-center font-black italic text-muted/50 group-hover:text-primary transition-colors text-xs md:text-base">
                                                    {rank}
                                                </div>
                                            )}
                                        </div>

                                        {/* Player Info Column */}
                                        <div className="col-span-10 sm:col-span-7 flex items-center gap-3 md:gap-4">
                                            <div className="relative shrink-0">
                                                <div className={cn(
                                                    "w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl overflow-hidden border-2 p-0.5",
                                                    rank === 1 ? "border-yellow-500" :
                                                        rank === 2 ? "border-slate-400" :
                                                            rank === 3 ? "border-amber-700" : "border-white/10"
                                                )}>
                                                    <img
                                                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name || profile.username}`}
                                                        className="w-full h-full object-cover rounded-md md:rounded-lg"
                                                    />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-black border border-white/20 flex items-center justify-center text-[7px] font-black text-primary">
                                                    L{levelData.level}
                                                </div>
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden flex-1">
                                                <div className="flex items-baseline justify-between gap-2 sm:block">
                                                    <p className="font-black text-xs md:text-sm text-white truncate group-hover:text-primary transition-colors">
                                                        {profile.full_name || profile.username || "Хэрэглэгч"}
                                                    </p>
                                                    <p className="sm:hidden font-black text-xs italic text-primary">
                                                        {profile.xp?.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    {(() => {
                                                        const RankIcon = levelData.rank.icon;
                                                        return <RankIcon className={cn("w-2.5 h-2.5 md:w-3 md:h-3", levelData.rank.iconColor)} />;
                                                    })()}
                                                    <span className={cn("text-[8px] md:text-[9px] font-bold uppercase tracking-tight truncate", levelData.rank.textGradient)}>
                                                        {levelData.rank.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* XP Power Column */}
                                        <div className="hidden sm:flex col-span-3 flex-col items-end gap-1">
                                            <p className={cn(
                                                "text-xl font-black italic tracking-tighter leading-none",
                                                rank === 1 ? "text-yellow-500" :
                                                    rank === 2 ? "text-slate-400" :
                                                        rank === 3 ? "text-amber-700" : "text-white"
                                            )}>
                                                {profile.xp?.toLocaleString()}
                                            </p>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${levelData.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 space-y-4 opacity-40">
                                <TrendingUp className="w-12 h-12" />
                                <p className="text-xs font-black uppercase tracking-[0.3em]">No Players found</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* MY RANK BAR (FIXED BOTTOM) */}
                <AnimatePresence>
                    {user && userProfile && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            className="fixed bottom-0 md:bottom-8 left-0 md:left-auto md:right-12 right-0 z-[100] px-4 py-4 md:py-0 w-full md:w-[450px] bg-gradient-to-t from-[#050505] to-transparent md:from-transparent md:to-transparent"
                        >
                            <div className="bg-[#0f0f0f]/95 border border-primary/40 backdrop-blur-3xl p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10 group overflow-hidden mb-safe">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-center gap-3 md:gap-4 relative z-10">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary flex items-center justify-center text-black font-black italic text-lg md:text-xl shadow-[0_0_25px_rgba(var(--primary-rgb),0.3)] shrink-0">
                                        {userRank}
                                    </div>
                                    <div className="space-y-0.5 overflow-hidden">
                                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-primary">Your Status</p>
                                        <p className="font-bold text-white text-sm md:text-base leading-none truncate">{userProfile.full_name || userProfile.username || "Хэрэглэгч"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:gap-10 relative z-10">
                                    <div className="text-right shrink-0">
                                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-muted">XP Power</p>
                                        <p className="font-black text-xl md:text-2xl italic text-white tracking-tighter leading-none">{(userProfile.xp || 0).toLocaleString()}</p>
                                    </div>
                                    <Link href="/profile">
                                        <button className="p-2.5 md:p-3 bg-white/5 hover:bg-primary transition-all rounded-lg md:rounded-xl hover:text-black">
                                            <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Login Prompt for Guests */}
                {!user && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-8 right-12 z-[100] hidden md:block w-[400px]"
                    >
                        <Link href="/?auth=true">
                            <div className="bg-surface border border-white/10 p-6 rounded-3xl flex items-center justify-between shadow-2xl group hover:border-primary/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">
                                        <LogIn className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-xs uppercase tracking-widest text-white leading-none mb-1">Join the Rank</p>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-tight">Login to accumulate XP</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </motion.div>
                )}
            </div>

            <RanksGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}
