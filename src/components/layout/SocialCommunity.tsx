"use client";

import { Users, Instagram, Facebook, Youtube, MessageSquare, X, Share2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const DiscordIcon = (props: any) => (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor" {...props}>
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.39,80.21a105.73,105.73,0,0,0,32.77,16.15,77.7,77.7,0,0,0,7.33-11.85,67.05,67.05,0,0,1-11.65-5.54c.95-.69,1.89-1.42,2.76-2.18a74.12,74.12,0,0,0,64.36,0c.87.76,1.81,1.49,2.76,2.18a67.21,67.21,0,0,1-11.66,5.54,77.34,77.34,0,0,0,7.33,11.85,105.36,105.36,0,0,0,32.8-16.18C130,50.23,121.39,26.41,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.09-12.73,11.41-12.73S54.08,46,53.86,53,48.77,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.09-12.73,11.41-12.73S96.14,46,95.93,53,90.76,65.69,84.69,65.69Z" />
    </svg>
);

const socialLinks = [
    {
        name: "Instagram",
        icon: Instagram,
        href: "https://www.instagram.com/mytoonuz/reels/",
        color: "from-[#f09433] via-[#e6683c] to-[#bc1888]",
    },
    {
        name: "Facebook",
        icon: Facebook,
        href: "https://www.facebook.com/profile.php?id=61587051845756",
        color: "from-[#1877F2] to-[#0051B9]",
    },
    {
        name: "Discord",
        icon: DiscordIcon,
        href: "https://discord.gg/TU5j48Fv",
        color: "from-[#5865F2] to-[#404EED]",
    },
    {
        name: "YouTube",
        icon: Youtube,
        href: "https://www.youtube.com/@mytoon0719",
        color: "from-[#FF0000] to-[#CD201F]",
    }
];

export function SocialCommunity() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const isReaderPage = pathname?.includes('/read/');

    return (
        <div className={cn(
            "fixed right-4 z-[5000] lg:right-8 flex flex-col items-center gap-4",
            isReaderPage ? "bottom-4" : "bottom-24 lg:bottom-8"
        )}>
            {/* Expanded List */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="p-2.5 rounded-[2rem] bg-black/60 backdrop-blur-3xl border border-white/10 flex flex-col items-center gap-3 shadow-2xl overflow-hidden"
                    >
                        {socialLinks.map((social, idx) => (
                            <motion.a
                                key={social.name}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={cn(
                                    "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group overflow-hidden",
                                    "bg-white/5 hover:bg-gradient-to-tr"
                                )}
                            >
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                    social.color
                                )} />
                                <social.icon className="w-5 h-5 text-white/50 group-hover:text-white z-10 transition-colors" />
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity",
                                    social.color
                                )} />
                            </motion.a>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 group"
            >
                {/* Glow Effect behind button */}
                <div className="absolute inset-0 bg-primary/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className={cn(
                    "absolute inset-0 rounded-full shadow-2xl flex items-center justify-center border border-white/10 transition-all duration-500 overflow-hidden",
                    isOpen ? "bg-zinc-800 rotate-90" : "bg-primary"
                )}>
                    {/* Hover internal overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    
                    {isOpen ? (
                        <X className="w-6 h-6 text-white relative z-10" />
                    ) : (
                        <Share2 className="w-6 h-6 text-white relative z-10" />
                    )}
                </div>
            </motion.button>
        </div>
    );
}
