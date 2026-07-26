"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2, LayoutDashboard, Film, Tag, Users, Wallet, Bell, Home, LogOut, ChevronRight, Shield
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
            const hasAccess = profile?.is_admin || profile?.is_moderator || profile?.is_youtuber;

            if (!user) {
                router.push("/");
            } else if (!hasAccess) {
                const timer = setTimeout(() => {
                    if (!hasAccess) router.push("/");
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user, profile, authLoading, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0610]">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        );
    }

    if (!user || (!profile?.is_admin && !profile?.is_moderator && !profile?.is_youtuber)) {
        return null;
    }

    const { is_admin: isAdmin, is_moderator: isModerator } = profile || {};

    interface MenuItem {
        label: string;
        icon: any;
        href: string;
        roles: string[];
    }

    const menuItems: MenuItem[] = [
        { label: "Хяналтын самбар", icon: LayoutDashboard, href: "/admin", roles: ["admin", "moderator"] },
        { label: "Бичлэгүүд (Videos)", icon: Film, href: "/admin/videos", roles: ["admin", "moderator"] },
        { label: "Категориуд (Categories)", icon: Tag, href: "/admin/categories", roles: ["admin", "moderator"] },
        { label: "Хэрэглэгчид ба Эрх", icon: Users, href: "/admin/users", roles: ["admin", "moderator"] },
        { label: "Санхүү ба Төлбөр", icon: Wallet, href: "/admin/finance", roles: ["admin"] },
        { label: "Системийн Мэдэгдэл", icon: Bell, href: "/admin/notifications", roles: ["admin"] },
    ];

    const userRoles: string[] = [];
    if (isAdmin) userRoles.push("admin");
    if (isModerator) userRoles.push("moderator");

    const filteredMenuItems = menuItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.some(role => userRoles.includes(role));
    });

    return (
        <div className="min-h-screen bg-[#0a0610] text-white flex">
            {/* Sidebar - Desktop */}
            <aside className="fixed top-0 left-0 bottom-0 w-64 bg-[#120d1c] border-r border-white/10 hidden md:flex flex-col z-50">
                <div className="p-6 pb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-red-600">Video Admin</h1>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Удирдлагын самбар</p>
                </div>

                <div className="px-4 mb-6">
                    <Link href="/videos">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white hover:bg-red-600 hover:text-white transition-all font-bold text-sm border border-white/10 cursor-pointer">
                            <Home className="w-5 h-5" />
                            Бичлэгийн сайт руу
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {filteredMenuItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm cursor-pointer",
                                pathname === item.href
                                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            )}>
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => router.push("/videos")}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm cursor-pointer"
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

                    <aside className="absolute top-0 left-0 bottom-0 w-64 bg-[#120d1c] border-r border-white/10 flex flex-col">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-tighter text-red-600">Video Admin</h1>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Удирдлагын самбар</p>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        </div>

                        <div className="px-4 mb-4">
                            <Link href="/videos" onClick={() => setIsMobileMenuOpen(false)}>
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white hover:bg-red-600 transition-all font-bold text-sm border border-white/10">
                                    <Home className="w-5 h-5" />
                                    Бичлэгийн сайт
                                </div>
                            </Link>
                        </div>

                        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                            {filteredMenuItems.map((item) => (
                                <Link 
                                    key={item.href} 
                                    href={item.href} 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <div className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                        pathname === item.href
                                            ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </div>
                                </Link>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[100vw] overflow-x-hidden">
                <div className="max-w-6xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
