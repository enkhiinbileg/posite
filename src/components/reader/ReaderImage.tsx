import { useState, memo } from "react";
import { Loader2, RefreshCw, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getCDNUrl } from "@/lib/storage-utils";

interface ReaderImageProps {
    src: string;
    alt: string;
    index: number;
    onClick?: () => void; // Pass click handler for toggle controls
}

export const ReaderImage = memo(function ReaderImage({ src, alt, index, onClick }: ReaderImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHasError(false);
        setIsLoaded(false);
        setRetryKey(prev => prev + 1);
    };

    // Low-resolution placeholder for the "blurred" effect
    const blurUrl = getCDNUrl(src, { width: 20, quality: 10, format: 'webp' });
    const mainUrl = getCDNUrl(src, { width: 800, quality: 75, format: 'avif' });

    return (
        <div
            className="w-full relative min-h-[400px] bg-[#0a0a0a] overflow-hidden"
            style={{ contain: 'paint' }} // Optimize paint performance
            onClick={onClick}
        >
            {/* 1. Blurred Base Layer (Always there while loading) */}
            <AnimatePresence>
                {!isLoaded && !hasError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-0"
                    >
                        <img
                            src={blurUrl}
                            className="w-full h-full object-cover blur-2xl scale-110 opacity-30"
                            alt="loading..."
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-primary/20 animate-spin" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Error State */}
            {hasError && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-20 cursor-pointer group"
                    onClick={handleRetry}
                >
                    <ImageOff className="w-10 h-10 text-neutral-600 mb-2 group-hover:text-neutral-400 transition-colors" />
                    <p className="text-xs text-neutral-500 mb-4">Зураг ачаалсангүй</p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-full text-xs font-bold text-neutral-300 group-hover:bg-neutral-700 transition-colors">
                        <RefreshCw className="w-3 h-3" />
                        Дахин уншуулах
                    </button>
                </div>
            )}

            {/* 3. High-Quality Image Layer */}
            <div className={cn(
                "relative w-full z-10 transition-all duration-300 ease-out transform-gpu",
                isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.01] blur-md"
            )}>
                <Image
                    key={retryKey}
                    src={mainUrl}
                    alt={alt}
                    width={800}
                    height={1200}
                    className="w-full h-auto select-none pointer-events-none will-change-transform"
                    unoptimized={true}
                    priority={index < 3} // Only first 3 for extreme LCP
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    sizes="(max-width: 800px) 100vw, 800px"
                />

                {/* Security Overlay */}
                <div
                    className="absolute inset-0 z-20 bg-transparent select-none cursor-default"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                />
            </div>
        </div>
    );
});
