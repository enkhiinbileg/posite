"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Crown, Check, MessageCircle, Home, History, Settings, LibraryBig, Youtube, Languages, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { StatsOverview } from "@/components/profile/StatsOverview";
import { ReadingHistoryList } from "@/components/profile/ReadingHistoryList";
import { WebtoonCard } from "@/components/home/WebtoonCard";
import { PricingPlans } from "@/components/subscription/PricingPlans";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { DailyActivityMap } from "@/components/profile/DailyActivityMap";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";

const getVipExpiryInfo = (expirationDate: string | null | undefined) => {
    if (!expirationDate) return null;
    const expiry = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    if (diffTime <= 0) return null;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days };
};

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();

    const vipInfo = profile?.is_vip && profile.vip_expiration ? getVipExpiryInfo(profile.vip_expiration) : null;
    const nsfwVipActive = profile?.nsfw_vip_expiration && new Date(profile.nsfw_vip_expiration) > new Date() ? true : false;
    const nsfwVipInfo = nsfwVipActive && profile?.nsfw_vip_expiration ? getVipExpiryInfo(profile.nsfw_vip_expiration) : null;
    // const [user, setUser] = useState<any>(null); // Replaced by useAuth
    // const [profile, setProfile] = useState<any>(null); // Replaced by useAuth
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    // Data States
    const [stats, setStats] = useState({ readCount: 0, commentCount: 0, likeCount: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [library, setLibrary] = useState<any[]>([]);
    const [following, setFollowing] = useState<any[]>([]);

    const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>(Array(7).fill(false));
    const [topGenres, setTopGenres] = useState<{ name: string; percentage: number; color: string }[]>([]);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            getProfileData();
        } else if (!authLoading) {
            router.push("/");
        }
    }, [user, authLoading]);

    async function getProfileData() {
        if (!user) return;
        setLoading(true);

        const today = new Date();

        try {
            // FIRE ALL 8 SQL QUERIES PARALLEL
            const [
                { count: readCount },
                { count: commentCount },
                { count: likeCount },
                { data: recentActivity },
                { data: historyData },
                { data: bookmarksData },
                { data: followsData },
                { data: logsData }
            ] = await Promise.all([
                supabase.from('reading_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('reading_progress').select('last_read_at, webtoon:webtoons(genres)').eq('user_id', user.id),
                supabase.from('reading_progress').select(`*, webtoon:webtoons(id, title, image), chapter:chapters(id, title)`).eq('user_id', user.id).order('last_read_at', { ascending: false }).limit(50),
                supabase.from('bookmarks').select(`*, webtoon:webtoons(*)`).eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('follows').select(`*, webtoon:webtoons(*)`).eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('user_activity_log').select('*').eq('user_id', user.id).order('activity_date', { ascending: false })
            ]);

            setStats({
                readCount: readCount || 0,
                commentCount: commentCount || 0,
                likeCount: likeCount || 0
            });

            const newWeeklyActivity = Array(7).fill(false);
            const genreCounts: Record<string, number> = {};
            let totalGenres = 0;

            if (recentActivity) {
                recentActivity.forEach((item: any) => {
                    if (item.last_read_at) {
                        const date = new Date(item.last_read_at);
                        const diffTime = Math.abs(today.getTime() - date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 7) newWeeklyActivity[7 - diffDays] = true;
                    }
                    if (item.webtoon?.genres && Array.isArray(item.webtoon.genres)) {
                        item.webtoon.genres.forEach((genre: string) => {
                            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                            totalGenres++;
                        });
                    }
                });
            }
            setWeeklyActivity(newWeeklyActivity);

            const sortedGenres = Object.entries(genreCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count], index) => ({
                    name,
                    percentage: (count / totalGenres) * 100,
                    color: index === 0 ? "text-primary" : index === 1 ? "text-blue-500" : "text-yellow-500"
                }));
            setTopGenres(sortedGenres);

            setHistory(historyData || []);
            setLibrary(bookmarksData?.map((b: any) => b.webtoon) || []);
            setFollowing(followsData?.map((f: any) => f.webtoon) || []);
            setActivityLogs(logsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch (e) {
            console.warn("Signout error:", e);
        } finally {
            window.location.href = "/";
        }
    };

    if (authLoading || (!user && loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen w-full pb-20 bg-[#050505]">
            <ProfileHeader
                user={user}
                profile={profile}
                onUpdate={refreshProfile}
                onSignOut={handleSignOut}
            />

            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="max-w-6xl mx-auto px-4 md:px-8">
                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        </div>
                        <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Мэдээлэл ачаалж байна...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "overview" && (
                            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-6">Үзүүлэлт</h3>
                                        <StatsOverview
                                            stats={stats}
                                            xp={profile?.xp || 0}
                                            weeklyActivity={weeklyActivity}
                                            topGenres={topGenres}
                                        />
                                    </section>

                                    <section>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-6">Сүүлд уншсан</h3>
                                        <ReadingHistoryList items={history.slice(0, 3)} />
                                    </section>

                                    <section className="hidden md:block">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Идэвхийн Хуанли</h3>
                                        </div>
                                        <div className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
                                            <DailyActivityMap activity={activityLogs.map(l => ({ date: l.activity_date, type: l.activity_type }))} />
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    {/* VIP Card */}
                                    <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
                                                    <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-yellow-500">VIP Гишүүнчлэл</h3>
                                                    <p className="text-[10px] text-muted font-bold uppercase">{profile?.is_vip ? "Идэвхтэй" : "Идэвхгүй"}</p>
                                                </div>
                                            </div>

                                            {profile?.is_vip && (
                                                <div className="mb-4 mt-2 space-y-2 border-t border-white/5 pt-4 text-xs">
                                                    <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                        <span className="text-white/60 font-medium">Дуусах огноо</span>
                                                        <span className="font-bold text-white font-mono">
                                                            {profile.vip_expiration ? new Date(profile.vip_expiration).toLocaleDateString("mn-MN") : "Хязгааргүй"}
                                                        </span>
                                                    </div>
                                                    {vipInfo && (
                                                        <div className="flex justify-between items-center bg-yellow-500/5 px-3 py-2 rounded-xl border border-yellow-500/10">
                                                            <span className="text-yellow-500/80 font-medium">Үлдсэн хугацаа</span>
                                                            <span className="font-black text-yellow-500 font-mono bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/10">
                                                                {vipInfo.days} хоног
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button onClick={() => router.push('/vip')} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all">
                                                {profile?.is_vip ? "Эрх сунгах" : "VIP эрх авах"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 18+ VIP Card */}
                                    <div className={cn(
                                        "rounded-3xl border p-6 relative overflow-hidden transition-all",
                                        nsfwVipActive 
                                            ? "border-rose-500/20 bg-rose-500/5" 
                                            : "border-white/5 bg-white/5 opacity-50"
                                    )}>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center border",
                                                    nsfwVipActive ? "bg-rose-500/20 border-rose-500/50" : "bg-white/5 border-white/10"
                                                )}>
                                                    <Crown className={cn("w-5 h-5", nsfwVipActive ? "text-rose-500 fill-rose-500" : "text-muted")} />
                                                </div>
                                                <div>
                                                    <h3 className={cn("text-sm font-black uppercase tracking-widest", nsfwVipActive ? "text-rose-500" : "text-muted")}>18+ VIP Гишүүнчлэл</h3>
                                                    <p className="text-[10px] text-muted font-bold uppercase">{nsfwVipActive ? "Идэвхтэй" : "Идэвхгүй"}</p>
                                                </div>
                                            </div>

                                            {nsfwVipActive && (
                                                <div className="mb-4 mt-2 space-y-2 border-t border-white/5 pt-4 text-xs">
                                                    <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                        <span className="text-white/60 font-medium">Дуусах огноо</span>
                                                        <span className="font-bold text-white font-mono">
                                                            {profile?.nsfw_vip_expiration ? new Date(profile.nsfw_vip_expiration).toLocaleDateString("mn-MN") : "Хязгааргүй"}
                                                        </span>
                                                    </div>
                                                    {nsfwVipInfo && (
                                                        <div className="flex justify-between items-center bg-rose-500/5 px-3 py-2 rounded-xl border border-rose-500/10">
                                                            <span className="text-rose-500/80 font-medium">Үлдсэн хугацаа</span>
                                                            <span className="font-black text-rose-500 font-mono bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/10">
                                                                {nsfwVipInfo.days} хоног
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button onClick={() => router.push('/vip')} className={cn(
                                                "w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all",
                                                nsfwVipActive 
                                                    ? "bg-gradient-to-r from-rose-500 to-red-500 text-white" 
                                                    : "bg-white/5 text-muted border border-white/10"
                                            )}>
                                                {nsfwVipActive ? "Эрх сунгах" : "18+ VIP эрх авах"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "membership" && <PricingPlans />}
                        {activeTab === "library" && (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                                {library.map(webtoon => (
                                    <WebtoonCard 
                                        key={webtoon.id} 
                                        {...webtoon} 
                                        chapter={webtoon.chapter_count_label}
                                    />
                                ))}
                                {library.length === 0 && (
                                    <div className="col-span-full py-20 text-center">
                                        <p className="text-muted text-lg font-bold">Таны сан хоосон байна.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === "following" && (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                                {following.map(webtoon => <WebtoonCard key={webtoon.id} {...webtoon} />)}
                            </div>
                        )}
                        {activeTab === "history" && <ReadingHistoryList items={history} />}
                        {activeTab === "settings" && <ProfileSettings profile={profile} onUpdate={refreshProfile} />}
                    </>
                )}
            </div>
        </main>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
