"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Shield, ShieldAlert, Check, X, User, Crown, Youtube, Languages, Film, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toggleUserRole, grantVipAction, revokeVipAction, fetchAllUsersAction, fetchPricingPlansAction, grantNsfwVipAction, revokeNsfwVipAction } from "@/app/actions/admin-roles";
import { getAllVideosAction, grantVideoAccessAction, getUserVideoAccessAction, revokeVideoAccessAction } from "@/app/actions/video-actions";

const TIER_COMMISSIONS = {
    bronze: 0.20,
    silver: 0.25,
    gold: 0.30
};

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<'all' | 'admin' | 'moderator' | 'youtuber' | 'translator' | 'vip'>('all');
    const [vipModal, setVipModal] = useState<{ userId: string, userName: string } | null>(null);
    const [pricingPlans, setPricingPlans] = useState<any[]>([]);
    const [isGranting, setIsGranting] = useState(false);
    const [customDays, setCustomDays] = useState<number>(30);
    const [nsfwVipModal, setNsfwVipModal] = useState<{ userId: string, userName: string } | null>(null);
    const [nsfwDays, setNsfwDays] = useState<number>(30);
    const [videoModal, setVideoModal] = useState<{ userId: string, userName: string } | null>(null);
    const [userAccess, setUserAccess] = useState<any[]>([]);
    const [allVideos, setAllVideos] = useState<any[]>([]);
    const [videoSearch, setVideoSearch] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<string>("");
    const [accessType, setAccessType] = useState<'rental' | 'purchase'>('rental');

    const router = useRouter();

    useEffect(() => {
        checkPermission();
        fetchPricingPlans();
        fetchVideos();
    }, []);

    useEffect(() => {
        if (videoModal) {
            fetchUserAccess(videoModal.userId);
        }
    }, [videoModal]);

    async function fetchUserAccess(userId: string) {
        const res = await getUserVideoAccessAction(userId);
        if (res.success) {
            setUserAccess(res.data || []);
        }
    }

    async function handleRevokeAccess(accessId: string) {
        if (!confirm("Энэ эрхийг цуцлахдаа итгэлтэй байна уу?")) return;
        
        const res = await revokeVideoAccessAction(accessId);
        if (res.success) {
            toast.success("Эрх цуцлагдлаа");
            if (videoModal) fetchUserAccess(videoModal.userId);
        } else {
            toast.error("Алдаа гарлаа: " + res.error);
        }
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsers(search, filter);
        }, 400); // Debounce search
        return () => clearTimeout(handler);
    }, [search, filter]);

    async function fetchPricingPlans() {
        const data = await fetchPricingPlansAction();
        setPricingPlans(data || []);
    }

    async function fetchVideos() {
        const res = await getAllVideosAction();
        if (res.success) setAllVideos(res.data || []);
    }

    async function checkPermission() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_admin) {
                router.push("/admin");
                toast.error("Танд энэ хэсэгт хандах эрх байхгүй!");
            }
        }
    }

    async function fetchUsers(searchTerm: string = "", filterType: string = "all") {
        setLoading(true);
        const result = await fetchAllUsersAction(searchTerm, filterType);
        if (!result.success) {
            toast.error("Хайлт хийхэд алдаа гарлаа: " + result.error);
        } else {
            setUsers(result.data || []);
        }
        setLoading(false);
    }

    async function toggleAdmin(id: string, currentStatus: boolean) {
        if (!confirm(`Та энэ хэрэглэгчийн эрхийг ${currentStatus ? 'хасах' : 'өгөх'}дөө итгэлтэй байна уу?`)) return;
        const result = await toggleUserRole(id, 'is_admin', !currentStatus);
        if (!result.success) toast.error("Алдаа гарлаа: " + result.error);
        else { setUsers(users.map(u => u.id === id ? { ...u, is_admin: !currentStatus } : u)); toast.success("Хэрэглэгчийн эрх өөрчлөгдлөө!"); }
    }

    async function toggleModerator(id: string, currentStatus: boolean) {
        if (!confirm(`Та энэ хэрэглэгчийн Moderator эрхийг ${currentStatus ? 'хасах' : 'өгөх'}дөө итгэлтэй байна уу?`)) return;
        const result = await toggleUserRole(id, 'is_moderator', !currentStatus);
        if (!result.success) toast.error("Алдаа гарлаа: " + result.error);
        else { setUsers(users.map(u => u.id === id ? { ...u, is_moderator: !currentStatus } : u)); toast.success("Moderator эрх өөрчлөгдлөө!"); }
    }

    async function toggleYouTuber(id: string, currentStatus: boolean) {
        if (!confirm(`Та энэ хэрэглэгчийн YouTuber эрхийг ${currentStatus ? 'хасах' : 'өгөх'}дөө итгэлтэй байна уу?`)) return;
        const result = await toggleUserRole(id, 'is_youtuber', !currentStatus);
        if (!result.success) toast.error("Алдаа гарлаа: " + result.error);
        else { setUsers(users.map(u => u.id === id ? { ...u, is_youtuber: !currentStatus } : u)); toast.success("YouTuber эрх өөрчлөгдлөө!"); }
    }

    async function toggleTranslator(id: string, currentStatus: boolean) {
        if (!confirm(`Та энэ хэрэглэгчийн Орчуулагч эрхийг ${currentStatus ? 'хасах' : 'өгөх'}дөө итгэлтэй байна уу?`)) return;
        const result = await toggleUserRole(id, 'is_translator', !currentStatus);
        if (!result.success) toast.error("Алдаа гарлаа: " + result.error);
        else { setUsers(users.map(u => u.id === id ? { ...u, is_translator: !currentStatus } : u)); toast.success("Орчуулагч эрх өөрчлөгдлөө!"); }
    }

    async function grantVip(plan: any, isTest: boolean = false, isCustom: boolean = false) {
        if (!vipModal || isGranting) return;

        setIsGranting(true);
        const toastId = toast.loading("VIP эрх олгож байна...");

        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();

            const durationValue = isCustom ? customDays : (isTest ? 1 : (plan?.duration_value || 1));
            const durationUnit = isCustom ? 'days' : (isTest ? 'minutes' : (plan?.duration_unit || 'months'));
            const price = isCustom || isTest ? 0 : (plan?.price || 0);

            const result = await grantVipAction({
                userId: vipModal.userId,
                adminId: adminUser?.id || '',
                planTitle: plan?.title || (isCustom ? `custom_${customDays}_days` : (isTest ? 'test_trial' : 'custom')),
                price,
                durationValue,
                durationUnit,
                isTest: isTest || isCustom
            });

            if (!result.success) {
                toast.error("VIP эрх өгөхд алдаа гарлаа: " + result.error, { id: toastId });
            } else {
                if (result.commissionApplied) toast.success(`YouTuber-т шимтгэл тооцогдлоо!`, { id: toastId });
                else toast.success(`${vipModal.userName}-д VIP эрх олголоо!`, { id: toastId });

                setVipModal(null);
                fetchUsers();
            }
        } catch (error: any) {
            toast.error("Алдаа гарлаа: " + error.message, { id: toastId });
        } finally {
            setIsGranting(false);
        }
    }

    async function revokeVip(id: string) {
        if (!confirm("Та энэ хэрэглэгчийн VIP эрхийг цуцлахдаа итгэлтэй байна уу?")) return;

        const { data: { user: adminUser } } = await supabase.auth.getUser();
        const { data: lastGrant } = await supabase
            .from('vip_grants')
            .select('price')
            .eq('user_id', id)
            .order('granted_at', { ascending: false })
            .limit(1)
            .single();

        const result = await revokeVipAction(id, adminUser?.id || '', lastGrant?.price || 0);
        if (!result.success) {
            toast.error("Алдаа гарлаа: " + result.error);
        } else {
            setUsers(users.map(u => u.id === id ? { ...u, is_vip: false, vip_expiration: null } : u));
            toast.success("VIP эрх цуцлагдлаа!");
        }
    }

    async function grantNsfwVip() {
        if (!nsfwVipModal || isGranting) return;
        setIsGranting(true);
        const toastId = toast.loading("+18 VIP эрх олгож байна...");

        try {
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const result = await grantNsfwVipAction({
                userId: nsfwVipModal.userId,
                adminId: adminUser?.id || '',
                durationDays: nsfwDays
            });

            if (!result.success) {
                toast.error("Алдаа гарлаа: " + result.error, { id: toastId });
            } else {
                toast.success(`${nsfwVipModal.userName}-д +18 VIP эрх олголоо!`, { id: toastId });
                setNsfwVipModal(null);
                fetchUsers(search, filter);
            }
        } catch (error: any) {
            toast.error("Алдаа гарлаа: " + error.message, { id: toastId });
        } finally {
            setIsGranting(false);
        }
    }

    async function revokeNsfwVip(id: string) {
        if (!confirm("Та энэ хэрэглэгчийн +18 VIP эрхийг цуцлахдаа итгэлтэй байна уу?")) return;
        
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        const result = await revokeNsfwVipAction(id, adminUser?.id || '');
        
        if (!result.success) {
            toast.error("Алдаа гарлаа: " + result.error);
        } else {
            setUsers(users.map(u => u.id === id ? { ...u, nsfw_vip_expiration: null } : u));
            toast.success("+18 VIP эрх цуцлагдлаа!");
        }
    }

    async function handleGrantVideo() {
        if (!videoModal || !selectedVideo || isGranting) return;
        setIsGranting(true);
        const res = await grantVideoAccessAction(videoModal.userId, selectedVideo, accessType);
        if (res.success) {
            toast.success("Видеоны эрх амжилттай олголоо!");
            setVideoModal(null);
            setSelectedVideo("");
        } else {
            toast.error(res.error);
        }
        setIsGranting(false);
    }

    async function updateReferralCode(id: string, code: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ referral_code: code || null })
            .eq('id', id);

        if (error) {
            if (error.code === '23505') {
                toast.error("Энэ код аль хэдийн ашиглагдсан байна!");
            } else {
                toast.error("Алдаа гарлаа: " + error.message);
            }
        } else {
            setUsers(users.map(u => u.id === id ? { ...u, referral_code: code } : u));
            toast.success("Referral код шинэчлэгдлээ!");
        }
    }

    async function updateAffiliateTier(id: string, tier: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ affiliate_tier: tier })
            .eq('id', id);

        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            setUsers(users.map(u => u.id === id ? { ...u, affiliate_tier: tier } : u));
            toast.success(`Tier ${tier.toUpperCase()} болж өөрчлөгдлөө!`);
        }
    }

    const filteredUsers = users; // Already filtered by server

    return (
        <div className="space-y-6 relative">
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Хэрэглэгчид</h2>
                <p className="text-muted">Нийт бүртгэлтэй хэрэглэгчдийн жагсаалт & эрхийн тохиргоо</p>
            </div>

            {/* Search */}
            <div className="bg-surface border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full md:w-auto md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Нэр, Username, ID-аар хайх..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                    {[
                        { id: 'all', label: 'Бүгд' },
                        { id: 'admin', label: 'Админ' },
                        { id: 'moderator', label: 'Модератор' },
                        { id: 'youtuber', label: 'YouTuber' },
                        { id: 'translator', label: 'Орчуулагч' },
                        { id: 'vip', label: 'VIP' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === tab.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-muted font-bold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-3 md:p-4 pl-4 md:pl-6 whitespace-nowrap">Хэрэглэгч</th>
                                <th className="p-3 md:p-4 whitespace-nowrap">Бүртгүүлсэн</th>
                                <th className="p-3 md:p-4 whitespace-nowrap">Эрх</th>
                                <th className="p-3 md:p-4 text-right pr-4 md:pr-6 whitespace-nowrap">Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-muted font-bold uppercase tracking-widest text-xs">
                                        Хэрэглэгч олдсонгүй
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-muted" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-white text-sm">{user.full_name || "Нэргүй"}</div>
                                                        {user.is_vip && (
                                                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-wide">
                                                                VIP
                                                            </span>
                                                        )}
                                                        {user.nsfw_vip_expiration && (
                                                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-wide">
                                                                +18 VIP
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-muted text-[10px] uppercase">{user.username || "No Username"}</span>
                                                        {user.unique_id && (
                                                            <span className="bg-white/10 px-1.5 rounded text-[10px] font-mono text-white/50">
                                                                #{user.unique_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted text-xs">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex flex-wrap gap-2">
                                                    {user.is_admin && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    {user.is_moderator && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-black border border-blue-500/20">
                                                            <Shield className="w-3 h-3" />
                                                            MOD
                                                        </span>
                                                    )}
                                                    {user.is_translator && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 text-[10px] font-black border border-purple-500/20">
                                                            <Languages className="w-3 h-3" />
                                                            TRANSLATOR
                                                        </span>
                                                    )}
                                                    {user.is_youtuber && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/10 text-red-600 text-[10px] font-black border border-red-600/20">
                                                                <Youtube className="w-3 h-3" />
                                                                CREATOR
                                                            </span>
                                                            {(user.bank_account_number || user.youtube_channel_name) && (
                                                                <div className="flex flex-col gap-0.5 mt-1 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[9px]">
                                                                    {user.youtube_channel_name && (
                                                                        <a href={user.youtube_channel_url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline flex items-center gap-1">
                                                                            <Youtube className="w-2.5 h-2.5" /> {user.youtube_channel_name}
                                                                        </a>
                                                                    )}
                                                                    {user.bank_account_number && (
                                                                        <p className="text-muted/60 font-medium">
                                                                            {user.bank_name}: {user.bank_account_number} ({user.bank_account_name})
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {user.is_vip && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-[10px] font-black border border-yellow-500/20">
                                                            <Crown className="w-3 h-3" />
                                                            VIP
                                                        </span>
                                                    )}
                                                    {user.nsfw_vip_expiration && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20">
                                                            <Crown className="w-3 h-3" />
                                                            +18 VIP
                                                        </span>
                                                    )}
                                                    {!user.is_admin && !user.is_moderator && !user.is_youtuber && !user.is_vip && !user.is_translator && !user.nsfw_vip_expiration && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-muted text-[10px] font-bold border border-white/5">
                                                            <User className="w-3 h-3" />
                                                            USER
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    {user.is_vip && user.vip_expiration && (
                                                        <span className="text-[9px] text-muted/60 font-medium">
                                                            VIP: {new Date(user.vip_expiration).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {user.nsfw_vip_expiration && (
                                                        <span className="text-[9px] text-red-500/60 font-medium">
                                                            +18: {new Date(user.nsfw_vip_expiration).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex flex-col gap-1">
                                                        {user.is_vip ? (
                                                            <button
                                                                onClick={() => revokeVip(user.id)}
                                                                className="px-2 py-1 rounded-md text-[9px] font-black transition-all border flex items-center gap-1 bg-red-500/5 border-red-500/10 hover:bg-red-500/20 text-red-500 uppercase tracking-tighter"
                                                            >
                                                                <X className="w-2 h-2" />
                                                                VIP хасах
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setVipModal({ userId: user.id, userName: user.full_name || user.username || "Нэргүй" })}
                                                                className="px-2 py-1 rounded-md text-[9px] font-black transition-all border flex items-center gap-1 bg-yellow-500/5 border-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 uppercase tracking-tighter"
                                                            >
                                                                <Crown className="w-2 h-2" />
                                                                VIP өгөх
                                                            </button>
                                                        )}

                                                        {user.nsfw_vip_expiration ? (
                                                            <button
                                                                onClick={() => revokeNsfwVip(user.id)}
                                                                className="px-2 py-1 rounded-md text-[9px] font-black transition-all border flex items-center gap-1 bg-red-500/5 border-red-500/10 hover:bg-red-500/20 text-red-500 uppercase tracking-tighter"
                                                            >
                                                                <X className="w-2 h-2" />
                                                                +18 хасах
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setNsfwVipModal({ userId: user.id, userName: user.full_name || user.username || "Нэргүй" })}
                                                                className="px-2 py-1 rounded-md text-[9px] font-black transition-all border flex items-center gap-1 bg-red-500/5 border-red-500/10 hover:bg-red-500/20 text-red-500 uppercase tracking-tighter"
                                                            >
                                                                <Crown className="w-2 h-2" />
                                                                +18 VIP
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setVideoModal({ userId: user.id, userName: user.full_name || user.username || "Нэргүй" })}
                                                            className="px-2 py-1 rounded-md text-[9px] font-black transition-all border flex items-center gap-1 bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/20 text-blue-500 uppercase tracking-tighter"
                                                        >
                                                            <Film className="w-2 h-2" />
                                                            Видео
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleModerator(user.id, user.is_moderator)}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-[10px] font-black transition-all border uppercase tracking-tighter",
                                                            user.is_moderator
                                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20"
                                                                : "bg-white/5 border-white/10 text-muted hover:text-white"
                                                        )}
                                                    >
                                                        Mod
                                                    </button>

                                                    <button
                                                        onClick={() => toggleYouTuber(user.id, user.is_youtuber)}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-[10px] font-black transition-all border uppercase tracking-tighter",
                                                            user.is_youtuber
                                                                ? "bg-red-600/10 border-red-600/20 text-red-600 hover:bg-red-600/20"
                                                                : "bg-white/5 border-white/10 text-muted hover:text-white"
                                                        )}
                                                    >
                                                        YouTuber
                                                    </button>

                                                    <button
                                                        onClick={() => toggleTranslator(user.id, user.is_translator)}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-[10px] font-black transition-all border uppercase tracking-tighter",
                                                            user.is_translator
                                                                ? "bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-500/20"
                                                                : "bg-white/5 border-white/10 text-muted hover:text-white"
                                                        )}
                                                    >
                                                        Translator
                                                    </button>

                                                    <button
                                                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                                                        className={cn(
                                                            "px-2 py-1 rounded-md text-[10px] font-black transition-all border uppercase tracking-tighter",
                                                            user.is_admin
                                                                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                                                                : "bg-white/5 border-white/10 text-muted hover:text-white"
                                                        )}
                                                    >
                                                        Admin
                                                    </button>
                                                </div>

                                                {user.is_youtuber && (
                                                    <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-300">
                                                        <input
                                                            type="text"
                                                            placeholder="Ref код"
                                                            defaultValue={user.referral_code || ""}
                                                            onBlur={(e) => {
                                                                if (e.target.value !== user.referral_code) {
                                                                    updateReferralCode(user.id, e.target.value);
                                                                }
                                                            }}
                                                            className="w-20 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[9px] text-white focus:outline-none focus:border-red-500/50 transition-all"
                                                        />
                                                        <select
                                                            value={user.affiliate_tier || 'bronze'}
                                                            onChange={(e) => updateAffiliateTier(user.id, e.target.value)}
                                                            className="w-16 bg-white/5 border border-white/10 rounded-md px-1 py-1 text-[9px] text-white focus:outline-none cursor-pointer uppercase font-black tracking-tighter"
                                                        >
                                                            <option value="bronze" className="bg-surface">BRONZE</option>
                                                            <option value="silver" className="bg-surface">SILVER</option>
                                                            <option value="gold" className="bg-surface">GOLD</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VIP Grant Modal */}
            {vipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setVipModal(null)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">VIP эрх олгох</h3>
                            <p className="text-muted text-sm">{vipModal.userName}</p>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-surface border border-white/5 mb-4 group hover:border-primary/50 transition-all">
                                <label className="text-[10px] uppercase font-black tracking-widest text-muted group-hover:text-primary transition-colors pl-1">Захиалгат хоног (Days)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={customDays}
                                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                        placeholder="Хоног"
                                        min="1"
                                    />
                                    <button
                                        onClick={() => grantVip(null, false, true)}
                                        disabled={isGranting || customDays < 1}
                                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                                    >
                                        Олгох
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => grantVip(null, true)}
                                disabled={isGranting}
                                className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-center group mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="font-bold text-red-500 text-[10px] uppercase tracking-widest">
                                    {isGranting ? "Уншиж байна..." : "Туршилт (1 Минут)"}
                                </span>
                            </button>

                            {pricingPlans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => grantVip(plan)}
                                    disabled={isGranting}
                                    className="w-full p-4 rounded-2xl bg-surface border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white group-hover:text-primary transition-colors">{plan.title}</span>
                                            <span className="text-[10px] text-muted">{plan.price.toLocaleString()}₮</span>
                                        </div>
                                        <span className="text-[10px] text-muted font-mono uppercase tracking-widest">
                                            {plan.duration_value} {plan.duration_unit}
                                        </span>
                                    </div>
                                </button>
                            ))}

                            {pricingPlans.length === 0 && (
                                <p className="text-center text-xs text-muted py-4 uppercase font-black tracking-widest animate-pulse">
                                    Багц олдсонгүй
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* NSFW VIP Grant Modal */}
            {nsfwVipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setNsfwVipModal(null)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">+18 VIP эрх олгох</h3>
                            <p className="text-muted text-sm">{nsfwVipModal.userName}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-surface border border-white/5 group hover:border-red-500/50 transition-all">
                                <label className="text-[10px] uppercase font-black tracking-widest text-muted group-hover:text-red-500 transition-colors pl-1">VIP хугацаа (Хоногоор)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={nsfwDays}
                                        onChange={(e) => setNsfwDays(parseInt(e.target.value) || 0)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                                        placeholder="Хоног"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={grantNsfwVip}
                                disabled={isGranting || nsfwDays < 1}
                                className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-600/20"
                            >
                                {isGranting ? "Олгож байна..." : "Эрх Олгох"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Access Modal */}
            {videoModal && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setVideoModal(null);
                    }}
                >
                    <div className="bg-[#0a0a0a]/95 border border-white/10 w-full max-w-md rounded-[2.5rem] relative shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setVideoModal(null);
                            }} 
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-zinc-500 hover:text-white hover:bg-white/10 transition-all z-[110]"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative z-10 p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                                    <Film className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Видео эрх <span className="text-primary">олгох</span></h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">{videoModal.userName}</p>
                            </div>

                            <div className="space-y-6">
                                {/* Grant Form */}
                                <div className="space-y-4 p-5 rounded-3xl bg-white/5 border border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Бичлэг хайх & сонгох</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                                <Search className="w-3.5 h-3.5" />
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Нэр эсвэл ID-аар хайх..."
                                                value={videoSearch}
                                                onChange={(e) => setVideoSearch(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-white outline-none text-xs font-bold transition-all focus:border-primary/50 focus:bg-white/[0.08]"
                                            />
                                        </div>
                                        <select 
                                            value={selectedVideo}
                                            onChange={(e) => setSelectedVideo(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white outline-none text-xs font-bold appearance-none cursor-pointer hover:border-white/20 transition-all focus:border-primary/50 mt-2"
                                        >
                                            <option value="" className="bg-[#0a0a0a]">Жагсаалтаас сонгох</option>
                                            {allVideos
                                                .filter(v => 
                                                    v.title.toLowerCase().includes(videoSearch.toLowerCase()) || 
                                                    v.id.toLowerCase().includes(videoSearch.toLowerCase())
                                                )
                                                .map(v => (
                                                    <option key={v.id} value={v.id} className="bg-[#0a0a0a]">
                                                        [{v.id.slice(0, 4).toUpperCase()}] {v.title}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Эрхийн төрөл</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => setAccessType('rental')}
                                                className={cn("py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", 
                                                    accessType === 'rental' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10"
                                                )}
                                            >
                                                <Clock className="w-3 h-3" />
                                                Түрээс
                                            </button>
                                            <button 
                                                onClick={() => setAccessType('purchase')}
                                                className={cn("py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", 
                                                    accessType === 'purchase' ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10"
                                                )}
                                            >
                                                <Shield className="w-3 h-3" />
                                                Бүрэн
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGrantVideo}
                                        disabled={!selectedVideo || isGranting}
                                        className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest mt-2 disabled:opacity-50 hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
                                    >
                                        {isGranting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Эрх Олгох
                                    </button>
                                </div>

                                {/* Current Access List */}
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Одоо байгаа эрхүүд ({userAccess.length})</label>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {userAccess.length === 0 ? (
                                            <div className="text-center py-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Эрх олдсонгүй</p>
                                            </div>
                                        ) : (
                                            userAccess.map((access) => (
                                                <div key={access.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <span className="text-[11px] font-black text-white truncate pr-2 uppercase tracking-tight">
                                                            {access.videos?.title}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md", 
                                                                access.access_type === 'purchase' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                                                            )}>
                                                                {access.access_type === 'purchase' ? "Бүрэн" : "Түрээс"}
                                                            </span>
                                                            {access.expires_at && (
                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase">
                                                                    Дуусах: {new Date(access.expires_at).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRevokeAccess(access.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
