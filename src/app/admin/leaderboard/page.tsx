"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal, Star, TrendingUp, Users, MessageCircle, BookOpen, Crown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeratorRanking {
    moderator_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    total_points: number;
    chapters_count: number;
    webtoons_count: number;
    messages_count: number;
}

export default function LeaderboardPage() {
    const [rankings, setRankings] = useState<ModeratorRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');

    useEffect(() => {
        fetchRankings();
    }, [period]);

    async function fetchRankings() {
        setLoading(true);
        let startDate = null;
        const now = new Date();

        if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else if (period === 'week') {
            const day = now.getDay() || 7;
            if (day !== 1) now.setHours(-24 * (day - 1));
            startDate = now.toISOString();
        }

        const { data, error } = await supabase.rpc('get_moderator_rankings', {
            period_start: startDate
        });

        if (!error && data) {
            setRankings(data);
        }
        setLoading(false);
    }

    const getMedalColor = (index: number) => {
        switch (index) {
            case 0: return "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"; // Gold
            case 1: return "text-zinc-300 drop-shadow-[0_0_10px_rgba(212,212,216,0.5)]";   // Silver
            case 2: return "text-amber-700 drop-shadow-[0_0_10px_rgba(180,83,9,0.5)]";    // Bronze
            default: return "text-muted";
        }
    };

    const getRankStyle = (index: number) => {
        if (index === 0) return "bg-gradient-to-br from-yellow-500/20 to-yellow-900/20 border-yellow-500/50 scale-[1.02] shadow-xl shadow-yellow-500/10";
        if (index === 1) return "bg-gradient-to-br from-zinc-500/20 to-zinc-900/20 border-zinc-500/50";
        if (index === 2) return "bg-gradient-to-br from-amber-700/20 to-amber-900/20 border-amber-700/50";
        return "bg-surface border-white/5 hover:border-white/10";
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-primary" />
                        Модератор Чансаа
                    </h2>
                    <p className="text-muted">Хамгийн идэвхтэй ажиллаж буй багийн гишүүд</p>
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                    {[
                        { id: 'week', label: 'Энэ 7 хоног' },
                        { id: 'month', label: 'Энэ сар' },
                        { id: 'all', label: 'Бүх цаг үе' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPeriod(tab.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all relative",
                                period === tab.id
                                    ? "bg-primary text-white shadow-lg"
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                {rankings.slice(0, 3).map((user, index) => (
                    <div
                        key={user.moderator_id}
                        className={cn(
                            "relative overflow-hidden p-6 rounded-3xl border flex flex-col items-center text-center transition-all duration-500",
                            getRankStyle(index),
                            index === 0 ? "md:-mt-8 order-first md:order-1 z-10" : "order-last md:order-none"
                        )}
                    >
                        {/* Crown/Medal */}
                        <div className="absolute top-4 right-4">
                            {index === 0 && <Crown className="w-6 h-6 text-yellow-500 animate-bounce" />}
                            {index === 1 && <Medal className="w-6 h-6 text-zinc-400" />}
                            {index === 2 && <Medal className="w-6 h-6 text-amber-700" />}
                        </div>

                        {/* Rank Number Background */}
                        <span className="absolute -left-4 -bottom-8 text-[150px] font-black text-white/5 select-none pointer-events-none">
                            {index + 1}
                        </span>

                        {/* Avatar */}
                        <div className={cn(
                            "w-24 h-24 rounded-full p-1 mb-4 relative",
                            index === 0 ? "bg-gradient-to-tr from-yellow-500 to-amber-600" :
                                index === 1 ? "bg-gradient-to-tr from-zinc-400 to-zinc-600" :
                                    "bg-gradient-to-tr from-amber-700 to-orange-900"

                        )}>
                            <img
                                src={user.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.username}
                                className="w-full h-full rounded-full object-cover bg-black"
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/10 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                                {user.total_points} оноо
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white truncate max-w-full">
                            {user.full_name || user.username}
                        </h3>
                        <p className="text-xs text-muted font-mono mb-6">@{user.username}</p>

                        <div className="grid grid-cols-3 w-full gap-2 text-xs">
                            <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center">
                                <BookOpen className="w-4 h-4 text-blue-400 mb-1" />
                                <span className="font-bold text-white">{user.webtoons_count}</span>
                                <span className="text-[9px] text-muted">Webtoon</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center">
                                <TrendingUp className="w-4 h-4 text-green-400 mb-1" />
                                <span className="font-bold text-white">{user.chapters_count}</span>
                                <span className="text-[9px] text-muted">Chapter</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center">
                                <MessageCircle className="w-4 h-4 text-purple-400 mb-1" />
                                <span className="font-bold text-white">{user.messages_count}</span>
                                <span className="text-[9px] text-muted">Reply</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* List for rest */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-muted font-bold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4 pl-6 w-16 text-center">#</th>
                            <th className="p-4">Модератор</th>
                            <th className="p-4 text-center">Нийт оноо</th>
                            <th className="p-4 text-center hidden md:table-cell">Webtoons (50p)</th>
                            <th className="p-4 text-center hidden md:table-cell">Chapters (10p)</th>
                            <th className="p-4 text-center hidden md:table-cell">Replies (2p)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rankings.slice(3).map((user, index) => (
                            <tr key={user.moderator_id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 pl-6 text-center font-bold text-muted text-lg">
                                    {index + 4}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden">
                                            <img
                                                src={user.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{user.full_name}</div>
                                            <div className="text-xs text-muted">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                        {user.total_points}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-muted hidden md:table-cell">{user.webtoons_count}</td>
                                <td className="p-4 text-center text-muted hidden md:table-cell">{user.chapters_count}</td>
                                <td className="p-4 text-center text-muted hidden md:table-cell">{user.messages_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rankings.length === 0 && !loading && (
                    <div className="p-8 text-center text-muted">
                        Одоогоор өгөгдөл алга байна.
                    </div>
                )}
            </div>
        </div>
    );
}
