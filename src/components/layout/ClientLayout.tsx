"use client";

import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
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

import { SocialCommunity } from "./SocialCommunity";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Global Error Suppression for Supabase/Network instability
    // This stops the annoying "Failed to fetch" alerts in the browser.
    useEffect(() => {
        const handleError = (e: any) => {
            const message = e?.message || e?.reason?.message || "";
            if (message.includes("Failed to fetch") || message.includes("Load failed")) {
                // Silencing these network failures as they are handled by our Streaming/Retry logic
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

    const { user, loading } = useAuth();
    const isAdminPage = pathname?.startsWith('/admin');
    const isReaderPage = pathname?.includes('/read/');
    const isLandingPage = pathname === '/' && !user;
    const isSecretPage = pathname === '/secret';
    const hideLayout = isAdminPage || isReaderPage || isLandingPage;
    const hideNavAndSidebar = hideLayout;

    return (
        <GlobalErrorBoundary>
            <div className="flex min-h-screen flex-col">
                <Suspense fallback={null}>
                    <PageLoader />
                </Suspense>
                {!hideNavAndSidebar && <Sidebar />}
                <div className={cn(
                    "flex-1 transition-all duration-300",
                    !hideNavAndSidebar && "lg:pl-24",
                    !hideLayout && "pb-20 lg:pb-0"
                )}>
                    {!hideNavAndSidebar && (
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
                        className="min-h-screen"
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
                {!hideLayout && <SocialCommunity />}
            </div>
        </GlobalErrorBoundary>
    );
}
