"use client";

import { motion } from "framer-motion";
import { BookOpen, MessageCircle, Heart, Trophy, Zap, TrendingUp, Crown, Sword, Shield, Star } from "lucide-react";
import { getLevelData } from "@/lib/leveling";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
    stats: {
        readCount: number;
        commentCount: number;
        likeCount: number;
    };
    xp: number;
    weeklyActivity?: boolean[];
    topGenres?: { name: string; percentage: number; color: string }[];
}

export function StatsOverview({ stats, xp, weeklyActivity = [], topGenres = [] }: StatsOverviewProps) {
    const levelData = getLevelData(xp || 0);
    const progress = levelData.progress;

    // Count active days
    const activeDaysCount = weeklyActivity.filter(Boolean).length;

    const STATS_ITEMS = [
        {
            label: "Нийт уншсан",
            value: stats.readCount,
            icon: BookOpen,
            color: "text-primary",
            bg: "bg-primary/10",
            border: "border-primary/20"
        },
        {
            label: "Сэтгэгдэл",
            value: stats.commentCount,
            icon: MessageCircle,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            label: "Лайк",
            value: stats.likeCount,
            icon: Heart,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20"
        }
    ];

    return (
        <div className="space-y-4 md:space-y-8">
            {/* EPIC RANK CARD (Ultimate Mobile Legends Style) */}
            <div className="relative group">
                {/* Outer Glow Pulse */}
                <div className={cn(
                    "absolute -inset-1 rounded-[1.5rem] md:rounded-[2.5rem] opacity-75 blur-xl transition-all duration-1000 group-hover:opacity-100",
                    levelData.rank.bgGradient.includes("emerald") ? "bg-green-500/20" :
                        levelData.rank.bgGradient.includes("blue") ? "bg-blue-500/20" :
                            levelData.rank.bgGradient.includes("purple") ? "bg-purple-500/20" : "bg-yellow-500/20"
                )} />

                <div className={cn(
                    "relative overflow-hidden rounded-[1.2rem] md:rounded-[2rem] border backdrop-blur-3xl",
                    "bg-[#050505]/80", // Darker base
                    levelData.rank.border,
                    levelData.rank.shadow
                )}>
                    {/* Dynamic Background Mesh */}
                    <div className={cn("absolute inset-0 opacity-40 mix-blend-screen", levelData.rank.bgGradient)} />

                    {/* Animated Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

                    <div className="relative p-5 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-12">

                        {/* Left: Rank Icon with Holographic Effect */}
                        <div className="relative z-10">
                            <div className={cn(
                                "w-24 h-24 md:w-40 md:h-40 rounded-full flex items-center justify-center relative",
                                "bg-gradient-to-b from-white/5 to-transparent border border-white/10 backdrop-blur-md shadow-2xl",
                                levelData.rank.glow
                            )}>
                                {/* Inner Rotating Ring */}
                                <div className="absolute inset-2 border border-white/20 rounded-full border-dashed animate-[spin_20s_linear_infinite]" />
                                <div className="absolute inset-2 border border-white/10 rounded-full border-dotted animate-[spin_15s_linear_infinite_reverse] scale-90" />

                                {/* Icon Glow */}
                                <div className={cn("absolute inset-0 rounded-full opacity-40 blur-2xl animate-pulse", levelData.rank.bgGradient)} />

                                <levelData.rank.icon className={cn(
                                    "w-12 h-12 md:w-20 md:h-20 relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]",
                                    levelData.rank.textGradient
                                )} />
                            </div>
                        </div>

                        {/* Middle: Info with Premium Typography */}
                        <div className="relative z-10 flex-1 text-center md:text-left space-y-3 md:space-y-4">
                            <div>
                                <h4 className="text-white/40 font-bold uppercase tracking-[0.3em] text-[9px] md:text-xs mb-1 md:mb-2">Одоогийн Цол</h4>
                                <h2 className={cn(
                                    "text-4xl md:text-6xl font-black uppercase italic tracking-tighter drop-shadow-2xl filter",
                                    levelData.rank.textGradient
                                )}>
                                    {levelData.rank.name}
                                </h2>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                                <div className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-[10px] md:text-xs font-black uppercase tracking-wider text-white ring-1 ring-white/5 shadow-lg flex items-center gap-1.5 md:gap-2.5">
                                    <div className="p-1 rounded-full bg-primary/20">
                                        <Sword className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-primary" />
                                    </div>
                                    <span className="opacity-80">Түвшин <span className="text-primary text-xs md:text-sm ml-1 drop-shadow-lg">{levelData.level}</span></span>
                                </div>
                                <div className="hidden md:flex px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-white ring-1 ring-white/5 shadow-lg items-center gap-2.5">
                                    <div className="p-1 rounded-full bg-yellow-500/20">
                                        <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                    </div>
                                    <span className="opacity-80">Эрэмбэ <span className="text-yellow-500 text-sm ml-1 drop-shadow-lg">Top 10%</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Right: XP Progress with Glassmorphism */}
                        <div className="relative z-10 w-full md:w-80 bg-black/40 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md shadow-xl">
                            <div className="flex justify-between text-[9px] md:text-[10px] font-black uppercase text-white/50 tracking-widest items-end mb-2 md:mb-3">
                                <span className="flex items-center gap-1.5 md:gap-2">
                                    <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-500 animate-pulse" />
                                    XP Ахиц
                                </span>
                                <div className="text-right">
                                    <span className="text-white text-base md:text-lg font-bold leading-none">{Math.floor(levelData.currentXP)}</span>
                                    <span className="text-white/30 ml-1 font-medium">/ {Math.floor(levelData.currentXP + levelData.xpToNext)} XP</span>
                                </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-3 md:h-4 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 relative p-[2px] md:p-[3px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                                {/* Actual Bar */}
                                <div className={cn(
                                    "h-full rounded-full relative overflow-hidden transition-all duration-1000 shadow-[0_0_15px_currentColor]",
                                    "bg-gradient-to-r from-green-600 to-emerald-400"
                                )} style={{ width: `${progress}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-[shimmer_2s_infinite]" />
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {STATS_ITEMS.map((item, index) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`col-span-1 even:last:col-span-2 md:even:last:col-span-1 rounded-2xl md:rounded-3xl border ${item.border} ${item.bg} p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 relative overflow-hidden group`}
                    >
                        <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-background/50 backdrop-blur-sm ${item.color}`}>
                            <item.icon className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <p className="text-muted text-[10px] md:text-xs font-black uppercase tracking-widest mb-0.5 md:mb-1">{item.label}</p>
                            <p className="text-xl md:text-2xl font-black text-white">{item.value}</p>
                        </div>
                        <item.icon className={`absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 opacity-5 rotate-12 ${item.color}`} />
                    </motion.div>
                ))}
            </div>

            {/* Real Stats Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Reading Days Graph */}
                <div className="rounded-2xl md:rounded-3xl border border-white/10 bg-surface p-4 md:p-6 h-40 md:h-48 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-muted">
                        <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Уншсан өдрүүд</span>
                    </div>
                    <div className="text-center">
                        <span className="text-3xl md:text-4xl font-black text-white">{activeDaysCount}</span>
                        <span className="text-muted text-xs md:text-sm font-bold ml-1 md:ml-2">ӨДӨР</span>
                    </div>
                    <div className="flex gap-1 justify-center items-end h-6 md:h-8">
                        {weeklyActivity.map((active, idx) => (
                            <div
                                key={idx}
                                className={`w-full max-w-[12px] md:max-w-[15px] rounded-full transition-all duration-500 ${active ? "h-full bg-primary shadow-[0_0_10px_rgba(74,222,128,0.5)]" : "h-1.5 bg-white/5"}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Genres Graph */}
                <div className="rounded-2xl md:rounded-3xl border border-white/10 bg-surface p-4 md:p-6 h-40 md:h-48 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center gap-2 text-muted relative z-10">
                        <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Төрлүүд</span>
                    </div>

                    <div className="relative z-10 space-y-3 md:space-y-4 mt-2">
                        {topGenres.length > 0 ? (
                            topGenres.slice(0, 3).map((genre) => (
                                <div key={genre.name} className="space-y-1">
                                    <div className="flex justify-between text-[9px] md:text-[10px] font-bold uppercase tracking-wide">
                                        <span className="text-white">{genre.name}</span>
                                        <span className={genre.color}>{Math.round(genre.percentage)}%</span>
                                    </div>
                                    <div className="h-1 md:h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${genre.percentage}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={`h-full ${genre.color.replace('text-', 'bg-')}`}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted text-xs">
                                Мэдээлэл алга
                            </div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
            </div>
        </div>
    );
}
