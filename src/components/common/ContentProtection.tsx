"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

interface ContentProtectionProps {
    children: React.ReactNode;
    isEnabled?: boolean;
}

export function ContentProtection({ children, isEnabled = true }: ContentProtectionProps) {
    const [isBlurred, setIsBlurred] = useState(false);

    useEffect(() => {
        if (!isEnabled) return;

        // 1. Basic Event Blocking
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12
            if (e.key === 'F12') { e.preventDefault(); return false; }

            // Block Ctrl Key combinations (U, S, P, I, C)
            if (e.ctrlKey || e.metaKey) {
                if (['u', 's', 'p', 'i', 'c'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    return false;
                }
            }

            // Block PrintScreen
            if (e.key === 'PrintScreen' || e.key === 'PrtSc') {
                e.preventDefault();
                setIsBlurred(true);
                toast.error("Скриншот хийхийг хориглоно!", { duration: 3000 });
                setTimeout(() => setIsBlurred(false), 3000);
                return false;
            }
        };

        const handleDragStart = (e: DragEvent) => e.preventDefault();

        // 2. Advanced Focus/Visibility Protection (The "Nuclear" Option)
        // This blocks Snipping Tools (Windows) and App Switching (Mobile)
        const handleBlur = () => {
            setIsBlurred(true);
        };

        const handleFocus = () => {
            setIsBlurred(false);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setIsBlurred(true);
            } else {
                // Keep blurred for a moment after returning to prevent quick glances
                setTimeout(() => setIsBlurred(false), 500);
            }
        };

        // Add Listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('dragstart', handleDragStart);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Prevent selection
        const originalStyle = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.body.style.userSelect = originalStyle;
            document.body.style.webkitUserSelect = originalStyle;
        };
    }, [isEnabled]);

    return (
        <div className="relative w-full h-full min-h-screen">
            {/* Main Content with Dynamic Blur */}
            <div
                className={cn(
                    "relative transition-all duration-500 ease-in-out h-full min-h-screen",
                    isBlurred ? "blur-3xl grayscale brightness-50 pointer-events-none scale-95" : "blur-0 grayscale-0 brightness-100"
                )}
            >
                {children}
            </div>

            {/* Security Warning Overlay */}
            <AnimatePresence>
                {isBlurred && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md text-white p-6 text-center select-none pointer-events-none"
                    >
                        <div className="bg-primary/20 p-6 rounded-full border border-primary/30 mb-6 animate-pulse">
                            <Lock className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Агуулга Хамгаалагдсан</h2>
                        <p className="text-white/70 max-w-sm">
                            Зөвшөөрөлгүй скриншот авах эсвэл зураг хуулахыг хориглоно. <br />
                            Уншихын тулд цонхоо идэвхжүүлнэ үү.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                img {
                    -webkit-user-drag: none !important;
                    user-drag: none !important;
                    -webkit-touch-callout: none !important;
                    user-select: none !important;
                }
                @media print {
                    body { display: none !important; }
                }
            `}</style>
        </div>
    );
}
