"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Search,
    Film,
    User,
    TrendingUp,
    Layers,
    Settings,
    Crown,
    MessageSquare,
    Shield,
    Sparkles,
    LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
    { name: "Нүүр / Видео", icon: Film, href: "/videos", type: "link", iconType: "lucide" },
    { name: "Эрх сунгах", icon: Crown, href: "/vip", type: "link", iconType: "lucide" },
    { name: "Профайл", icon: User, href: "/profile", type: "link", iconType: "lucide" },
];

const categories = [
    { name: "Чансаа", icon: TrendingUp, href: "/leaderboard", type: "link", iconType: "lucide" },
    { name: "Төрөл", icon: Layers, href: "/", type: "link", iconType: "lucide" },
    { name: "Санал хүсэлт", icon: MessageSquare, href: "/suggestions", type: "link", iconType: "lucide" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { profile } = useAuth();
    const hasPermission = profile?.is_admin || profile?.is_moderator || profile?.is_youtuber;

    const handleItemClick = (item: any, e: React.MouseEvent) => {
        if (item.type === "search") {
            e.preventDefault();
            window.dispatchEvent(new Event('openSearch'));
        }
    };

    const allMenuItems: any[] = [
        ...menuItems,
        { 
            name: "Secret", 
            icon: Sparkles, 
            href: "/secret", 
            type: "link", 
            iconType: "image", 
            imageSrc: "/nsfw-icon.jpg" 
        },
        ...(hasPermission ? [{ name: "Удирдлага", icon: Shield, href: "/admin", type: "link", iconType: "lucide" }] : [])
    ];

    return (
        <div className="fixed left-0 top-0 h-full w-24 bg-[#050505]/80 backdrop-blur-2xl border-r border-white/5 hidden lg:flex flex-col z-50">
            {/* Brand Logo Area */}
            <div className="h-24 flex items-center justify-center">
                <Link href="/" className="group relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                        <img
                            src="/logo.png"
                            alt="MyToon Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-8 flex flex-col items-center overflow-y-auto no-scrollbar">
                <div className="space-y-6 w-full">
                    {allMenuItems.map((item) => {
                        const isActive = pathname === item.href && item.type === "link";
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={(e) => handleItemClick(item, e)}
                                className={cn(
                                    "relative flex items-center justify-center p-3.5 rounded-2xl transition-all duration-300 group w-full",
                                    isActive
                                        ? "text-white"
                                        : "text-muted hover:text-white"
                                )}
                            >
                                {/* Active Indicator Background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 bg-white/5 rounded-2xl border border-white/5"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Active Left Bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-bar"
                                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_2px_rgba(225,29,72,0.5)]"
                                    />
                                )}

                                {item.iconType === "image" ? (
                                    <div className={cn(
                                        "w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-all duration-300 z-10",
                                        isActive && "border-primary shadow-[0_0_15px_rgba(225,29,72,0.5)]"
                                    )}>
                                        <img src={item.imageSrc} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <item.icon className={cn(
                                        "w-6 h-6 z-10 transition-transform duration-300",
                                        isActive ? "scale-105" : "group-hover:scale-110",
                                        isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                    )} />
                                )}

                                {/* Tooltip */}
                                <div className="absolute left-full ml-5 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                                    {item.name}
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-[#1a1a1a]" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="w-8 h-px bg-white/5" />

                <div className="space-y-2 w-full">
                    {categories.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center justify-center p-3 rounded-xl text-muted/50 hover:text-white hover:bg-white/5 transition-all duration-300 group relative"
                        >
                            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />

                            {/* Tooltip */}
                            <div className="absolute left-full ml-5 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                                {item.name}
                            </div>
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="p-6">
                <Link
                    href="/profile?tab=settings"
                    className="flex items-center justify-center p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all duration-300 group relative border border-white/5"
                >
                    <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                </Link>
            </div>
        </div>
    );
}
