export function ReaderSkeleton() {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header Skeleton */}
            <div className="fixed top-0 left-0 right-0 z-[100] h-16 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                    <div className="space-y-2">
                        <div className="w-32 h-3 bg-white/10 animate-pulse rounded" />
                        <div className="w-20 h-2 bg-white/10 animate-pulse rounded opacity-50" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded bg-white/10 animate-pulse" />
                    <div className="w-6 h-6 rounded bg-white/10 animate-pulse" />
                </div>
            </div>

            {/* Content Skeletons (The big long images) */}
            <div className="pt-16 flex flex-col items-center w-full gap-1">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-full aspect-[2/3] max-w-[800px] bg-white/5 animate-pulse"
                    />
                ))}
            </div>

            {/* Bottom Controls Placeholder */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-14 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 animate-pulse z-50" />
        </div>
    );
}
