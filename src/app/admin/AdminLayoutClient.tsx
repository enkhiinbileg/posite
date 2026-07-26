"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Loader2, LayoutDashboard, BookOpen, FilePlus, LogOut, ChevronRight, Users,
    Image as ImageIcon, MessageCircle, Home, Bell, HelpCircle, Mail, Trophy,
    MessageSquare, Shield, Clock, Youtube, Wallet, DollarSign, PenTool,
    BarChart3, Settings, Menu, X, Wrench, Tag, Share2, Calendar, Film
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, profile, loading: authLoading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            const hasAccess = profile?.is_admin || profile?.is_moderator || profile?.is_youtuber || profile?.is_translator;

            if (!user) {
                router.push("/");
            } else if (!hasAccess) {
                // Wait a tiny bit just in case profile is still updating
                const timer = setTimeout(() => {
                    if (!hasAccess) router.push("/");
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user, profile, authLoading, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user || (!profile?.is_admin && !profile?.is_moderator && !profile?.is_youtuber && !profile?.is_translator)) {
        return null; // Redirecting...
    }

    const { is_admin: isAdmin, is_moderator: isModerator, is_youtuber: isYouTuber, is_translator: isTranslator } = profile || {};

    interface MenuItem {
        label: string;
        icon: any;
        href: string;
        roles: string[];
        external?: boolean;
    }

    const menuItems: MenuItem[] = [
        { label: "Хяналтын самбар", icon: LayoutDashboard, href: "/admin", roles: ["admin", "moderator", "youtuber"] },
        { label: "Хуваарь", icon: Calendar, href: "/admin/schedule", roles: ["admin", "moderator"] },
        { label: "Сошиал менежер", icon: Share2, href: "/admin/social", roles: ["admin", "moderator"] },
        { label: "Орчуулгын самбар", icon: LayoutDashboard, href: "/translator/dashboard", roles: ["translator"] },
        { label: "Статистик", icon: Trophy, href: "/admin/stats", roles: ["admin"] },
        { label: "Нүүр хуудас", icon: LayoutDashboard, href: "/admin/homepage", roles: ["admin"] },
        { label: "Баннерууд", icon: ImageIcon, href: "/admin/banners", roles: ["admin", "moderator"] },
        { label: "Вэбтүүнүүд", icon: BookOpen, href: "/admin/webtoons", roles: ["admin", "moderator", "translator"] },
        { label: "Бүлгүүд", icon: FilePlus, href: "/admin/chapters", roles: ["admin", "moderator", "translator"] },
        { label: "Сэтгэгдэл", icon: MessageCircle, href: "/admin/comments", roles: ["admin", "moderator"] },
        { label: "Орчуулгын заавар", icon: HelpCircle, href: "/admin/imagetrans", roles: ["admin", "moderator", "translator"] },
        { label: "Чансаа", icon: Trophy, href: "/admin/leaderboard", roles: ["admin", "moderator"] },
        { label: "Санал хүсэлт", icon: MessageSquare, href: "/admin/suggestions", roles: ["admin", "moderator"] },
        { label: "Хэрэглэгчид", icon: Users, href: "/admin/users", roles: ["admin", "moderator"] },
        { label: "Багц/Үнэ", icon: Tag, href: "/admin/pricing", roles: ["admin"] },
        { label: "YouTuber", icon: Youtube, href: "/admin/youtuber", roles: ["admin", "youtuber"] },
        { label: "Санхүү", icon: Wallet, href: "/admin/finance", roles: ["admin"] },
        { label: "Төлбөр", icon: DollarSign, href: "/admin/payouts", roles: ["admin", "translator"] },
        { label: "Бичлэгүүд", icon: Film, href: "/admin/videos", roles: ["admin", "moderator"] },
        { label: "Модератор Тайлан", icon: Shield, href: "/admin/moderators", roles: ["admin", "moderator"] },
        { label: "Мэдэгдэл", icon: Bell, href: "/admin/notifications", roles: ["admin"] },
        { label: "Багажууд", icon: Shield, href: "/admin/chapters/fix", roles: ["admin"] },
    ];

    const userRoles: string[] = [];
    if (isAdmin) userRoles.push("admin");
    if (isModerator) userRoles.push("moderator");
    if (isYouTuber) userRoles.push("youtuber");
    if (isTranslator) userRoles.push("translator");

    const filteredMenuItems = menuItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.some(role => userRoles.includes(role));
    });

    if (filteredMenuItems.length === 0 && !isAdmin && !isModerator && !isYouTuber) {
        router.push("/");
        return null;
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar - Desktop */}
            <aside className="fixed top-0 left-0 bottom-0 w-64 bg-surface border-r border-white/5 hidden md:flex flex-col z-50">
                <div className="p-8 pb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-primary">Admin</h1>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest mt-1">Content Manager</p>
                </div>

                <div className="px-4 mb-6">
                    <Link href="/">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white hover:bg-primary hover:text-white transition-all font-bold text-sm border border-white/5">
                            <Home className="w-5 h-5" />
                            Нүүр хуудас руу
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {filteredMenuItems.map((item) => (
                        <Link 
                            key={item.href} 
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                        >
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                pathname === item.href
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-muted hover:bg-white/5 hover:text-white"
                            )}>
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => router.push("/")}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
                    >
                        <LogOut className="w-5 h-5" />
                        Гарах
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    <aside className="absolute top-0 left-0 bottom-0 w-64 bg-surface border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-tighter text-primary">Admin</h1>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5">Content Manager</p>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-muted hover:text-white"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        </div>

                        <div className="px-4 mb-4">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white hover:bg-primary hover:text-white transition-all font-bold text-sm border border-white/5">
                                    <Home className="w-5 h-5" />
                                    Нүүр
                                </div>
                            </Link>
                        </div>

                        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">

                            {filteredMenuItems.map((item) => (
                                <Link 
                                    key={item.href} 
                                    href={item.href} 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    target={item.external ? "_blank" : undefined}
                                    rel={item.external ? "noopener noreferrer" : undefined}
                                >
                                    <div className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                        pathname === item.href
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-muted hover:bg-white/5 hover:text-white"
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </div>
                                </Link>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => router.push("/")}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
                            >
                                <LogOut className="w-5 h-5" />
                                Гарах
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[100vw] overflow-x-hidden">
                <div className="max-w-5xl mx-auto w-full">
                    {children}
                </div>
            </main>

            {/* Mobile Header Overlay */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 border-b border-white/5 flex items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="w-6 h-6" />
                    </button>
                    <span className="font-black text-white tracking-widest text-sm">ADMIN PANEL</span>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && <span className="text-[10px] font-black bg-primary px-2 py-0.5 rounded text-white">ADMIN</span>}
                    {isModerator && !isAdmin && <span className="text-[10px] font-black bg-blue-500 px-2 py-0.5 rounded text-white">MOD</span>}
                    {isYouTuber && !isAdmin && !isModerator && <span className="text-[10px] font-black bg-red-600 px-2 py-0.5 rounded text-white">YOUTUBER</span>}
                </div>
            </div>
        </div>
    );
}
