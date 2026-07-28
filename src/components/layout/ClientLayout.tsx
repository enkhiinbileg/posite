"use client";

import { motion } from "framer-motion";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { SearchOverlay } from "./SearchOverlay";
import { MenuDrawer } from "./MenuDrawer";
import { PageLoader } from "./PageLoader";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlobalErrorBoundary } from "@/components/ErrorBoundary";
import { ReferralTracker } from "./ReferralTracker";
import { Suspense, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";


export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Global Error Suppression for Supabase/Network instability
    useEffect(() => {
        const handleError = (e: any) => {
            const message = e?.message || e?.reason?.message || "";
            if (message.includes("Failed to fetch") || message.includes("Load failed")) {
                if (e.preventDefault) e.preventDefault();
                return true;
            }
        };

        window.addEventListener('unhandledrejection', handleError);
        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('unhandledrejection', handleError);
            window.removeEventListener('error', handleError);
        };
    }, []);

    const { user } = useAuth();
    const isAdminPage = pathname?.startsWith('/admin');
    const isReaderPage = pathname?.includes('/read/');
    const isLandingPage = pathname === '/' && !user;
    const isSecretPage = pathname === '/secret';
    const hideLayout = isAdminPage || isReaderPage || isLandingPage;
    const hideNav = hideLayout;

    return (
        <GlobalErrorBoundary>
            <div className="flex min-h-screen flex-col w-full">
                <Suspense fallback={null}>
                    <PageLoader />
                </Suspense>
                
                <div className="flex-1 w-full transition-all duration-300">
                    {!hideNav && (
                        isSecretPage ? (
                            <div className="hidden lg:block">
                                <Navbar />
                            </div>
                        ) : (
                            <Navbar />
                        )
                    )}
                    <motion.main
                        key={hideLayout ? "standalone" : "layout"}
                        initial={{ opacity: 0, y: hideLayout ? 0 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="min-h-screen w-full"
                    >
                        {children}
                    </motion.main>
                </div>
                <SearchOverlay />
                <MenuDrawer />
                {!hideLayout && <BottomNav />}
                {!hideLayout && (
                    <Suspense fallback={null}>
                        <ReferralTracker />
                    </Suspense>
                )}
            </div>
        </GlobalErrorBoundary>
    );
}
