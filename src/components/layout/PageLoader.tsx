"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function PageLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Trigger loading on path change
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 300); // 300ms is enough to feel "instant"
        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 0.8, opacity: 1 }}
                    exit={{ scaleX: 1, opacity: 0 }}
                    transition={{ 
                        scaleX: { duration: 0.2, ease: "easeOut" },
                        opacity: { duration: 0.3 }
                    }}
                    className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-pink-500 z-[100] origin-left shadow-[0_0_10px_rgba(225,29,72,0.8)]"
                />
            )}
        </AnimatePresence>
    );
}
