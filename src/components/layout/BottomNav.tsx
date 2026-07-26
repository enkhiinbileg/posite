"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, LibraryBig, User, LayoutGrid, ShieldAlert, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: "НҮҮР", icon: Home, href: "/home", type: "link" },
        { label: "SECRET", icon: ShieldAlert, href: "/secret", type: "link" },
        { label: "ВЭБТҮҮН", icon: LayoutGrid, href: "/webtoon", type: "link" },
        { label: "ВИДЕО", icon: Film, href: "/videos", type: "link" },
        { label: "ЦЭС", icon: User, href: "#", type: "menu" },
    ];

    const handleItemClick = (item: any, e: React.MouseEvent) => {
        if (item.type === "search") {
            e.preventDefault();
            window.dispatchEvent(new Event('openSearch'));
        }
        if (item.type === "menu") {
            e.preventDefault();
            window.dispatchEvent(new Event('openMenu'));
        }
        if (item.type === "link") {
            e.preventDefault();
            router.push(item.href);
        }
    };

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-none">
            {/* The Floating Island Container */}
            <div className="relative mx-auto bg-[#050505]/90 backdrop-blur-[40px] border-t border-white/[0.08] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pointer-events-auto h-[72px] overflow-visible">
                {/* Subtle bloody/red ambient glow at the edges of the bar */}
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/[0.02] to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-around h-full px-2 max-w-lg mx-auto relative">
                    {navItems.map((item) => {
                        const isActive = (pathname === item.href || (item.href === '/home' && pathname === '/')) && item.type === "link";
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={(e) => handleItemClick(item, e)}
                                className="group flex flex-col items-center justify-center w-[20%] h-full relative z-10 outline-none select-none pt-1"
                            >
                                {/* The Magnetic Top Beam (Apple/Android Premium Native Style) */}
                                {isActive && (
                                    <motion.div
                                        layoutId="topBeam"
                                        className="absolute top-0 w-[44px] h-[3px] rounded-b-full bg-red-500 shadow-[0_2px_16px_rgba(239,68,68,1)]"
                                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                    />
                                )}

                                {/* Volumetric Active Aura */}
                                {isActive && (
                                    <motion.div
                                        layoutId="ambientAura"
                                        className="absolute inset-x-2 top-2 bottom-3 rounded-3xl bg-gradient-to-b from-red-500/10 to-transparent blur-[10px] -z-10"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                
                                {/* Physics-Driven Icon Block */}
                                <motion.div
                                    whileTap={{ scale: 0.8 }}
                                    animate={{ 
                                        y: isActive ? -4 : 2,
                                        scale: isActive ? 1.15 : 1,
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                    className="relative flex flex-col items-center"
                                >
                                    <Icon className={cn(
                                        "w-[22px] h-[22px] mb-1 transition-colors duration-400",
                                        isActive ? "text-white" : "text-[#505050] group-hover:text-[#888]"
                                    )} strokeWidth={isActive ? 2.5 : 2} />
                                    
                                    {/* Flash Effect on Active */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-[8px] animate-pulse-slow -z-10" />
                                    )}
                                </motion.div>

                                {/* Shifting Typographic Label */}
                                <motion.span 
                                    animate={{ 
                                        y: isActive ? -1 : 3,
                                        opacity: isActive ? 1 : 0.6,
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    className={cn(
                                        "text-[9px] font-black tracking-[0.1em] transition-colors duration-400 uppercase",
                                        isActive ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-[#505050]"
                                    )}
                                >
                                    {item.label}
                                </motion.span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
