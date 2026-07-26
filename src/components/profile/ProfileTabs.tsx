"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProfileTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: "overview", label: "Тойм" },
    { id: "library", label: "Сан" },
    { id: "following", label: "Дагасан" },
    { id: "history", label: "Түүх" },
    { id: "settings", label: "Тохиргоо" },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8 mb-6 md:mb-8">
            <div className="bg-surface/50 p-1.5 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-md overflow-x-auto scrollbar-hide">
                <div className="flex items-center min-w-max md:min-w-0">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "relative px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap md:flex-1 text-center min-w-[80px]",
                                activeTab === tab.id ? "text-white" : "text-muted hover:text-white/80"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-primary shadow-[0_0_20px_rgba(229,9,20,0.3)] rounded-xl md:rounded-2xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
