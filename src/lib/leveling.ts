import { Sprout, Scroll, Zap, Crown, Shield, Flame, Stars, Ghost } from "lucide-react";

export type Rank = {
    name: string;
    minXP: number;
    icon: any;
    textGradient: string;
    bgGradient: string;
    border: string;
    shadow: string;
    glow: string;
    iconColor: string;
};

export const RANKS: Rank[] = [
    {
        name: "Шинэ Уншигч",
        minXP: 0,
        icon: Sprout,
        textGradient: "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-emerald-900/50 via-green-900/30 to-black",
        border: "border-green-500/30",
        shadow: "shadow-[0_0_30px_rgba(74,222,128,0.1)]",
        glow: "shadow-[0_0_20px_rgba(74,222,128,0.2)]",
        iconColor: "text-green-400"
    },
    {
        name: "Идэвхтэй Уншигч",
        minXP: 2000,
        icon: Scroll,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-blue-300 via-blue-100 to-blue-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-900/50 via-slate-900/40 to-black",
        border: "border-blue-400/50",
        shadow: "shadow-[0_0_40px_rgba(59,130,246,0.2)]",
        glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]",
        iconColor: "text-blue-400"
    },
    {
        name: "Вэбтүүн Хорхойтон",
        minXP: 10000,
        icon: Zap,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-300 via-purple-200 to-purple-600 drop-shadow-[0_0_20px_rgba(192,38,211,0.6)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-purple-900/60 via-fuchsia-900/40 to-black",
        border: "border-fuchsia-500/60",
        shadow: "shadow-[0_0_50px_rgba(192,38,211,0.3)]",
        glow: "shadow-[0_0_35px_rgba(192,38,211,0.4)]",
        iconColor: "text-fuchsia-400"
    },
    {
        name: "Webtoon Master",
        minXP: 35000,
        icon: Crown,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-600 drop-shadow-[0_0_25px_rgba(234,179,8,0.8)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-amber-600/20 via-yellow-900/40 to-black",
        border: "border-yellow-400/70",
        shadow: "shadow-[0_0_60px_rgba(234,179,8,0.4)]",
        glow: "shadow-[0_0_40px_rgba(234,179,8,0.5)]",
        iconColor: "text-yellow-400"
    },
    {
        name: "Grandmaster",
        minXP: 80000,
        icon: Shield,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-red-200 via-red-400 to-red-800 drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-red-900/40 via-red-950 to-black",
        border: "border-red-500/50",
        shadow: "shadow-[0_0_70px_rgba(220,38,38,0.3)]",
        glow: "shadow-[0_0_50px_rgba(220,38,38,0.4)]",
        iconColor: "text-red-500"
    },
    {
        name: "Legendary Reader",
        minXP: 200000,
        icon: Flame,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-orange-200 via-orange-500 to-red-600 animate-pulse drop-shadow-[0_0_35px_rgba(249,115,22,0.9)]",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-orange-900/40 via-red-950 to-black",
        border: "border-orange-500/50",
        shadow: "shadow-[0_0_80px_rgba(249,115,22,0.4)]",
        glow: "shadow-[0_0_60px_rgba(249,115,22,0.5)]",
        iconColor: "text-orange-500"
    },
    {
        name: "Webtoon Deity",
        minXP: 500000,
        icon: Ghost,
        textGradient: "text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-white to-purple-400 drop-shadow-[0_0_40px_rgba(255,255,255,1)] font-black",
        bgGradient: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-purple-950 to-black",
        border: "border-white/40",
        shadow: "shadow-[0_0_100px_rgba(255,255,255,0.3)]",
        glow: "shadow-[0_0_80px_rgba(255,255,255,0.4)]",
        iconColor: "text-white"
    }
];

export function getLevelData(xp: number) {
    // Progressive formula: Level = floor(sqrt(xp / 50)) + 1
    // Level 1: 0, Level 10: 4050, Level 50: 120,050, Level 100: 490,050
    const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;

    // Find Rank
    const rank = [...RANKS].reverse().find(r => xp >= r.minXP) || RANKS[0];

    // Next Level Progress
    const xpForThisLevel = Math.pow(level - 1, 2) * 50;
    const xpForNextLevel = Math.pow(level, 2) * 50;

    const progress = Math.min(100, Math.max(0, ((xp - xpForThisLevel) / (xpForNextLevel - xpForThisLevel)) * 100));
    const xpToNext = Math.max(0, xpForNextLevel - xp);

    return {
        level,
        rank,
        progress: isNaN(progress) ? 0 : progress,
        currentXP: xp,
        xpToNext
    };
}

