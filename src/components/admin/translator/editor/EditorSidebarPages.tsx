import React from 'react';
import { cn } from '@/lib/utils';

interface Image {
    id: string;
    preview: string;
}

interface EditorSidebarPagesProps {
    images: Image[];
    activeImageId: string;
    canvasRef: React.RefObject<any>;
    scrollContainerRef: React.RefObject<any>;
    viewport: { scale: number, x: number, y: number };
    setViewport: React.Dispatch<React.SetStateAction<{ scale: number, x: number, y: number }>>;
}

export const EditorSidebarPages = React.memo(({
    images,
    activeImageId,
    canvasRef,
    scrollContainerRef,
    viewport,
    setViewport
}: EditorSidebarPagesProps) => {
    const handlePageClick = (img: Image) => {
        const el = document.getElementById(`page-${img.id}`);
        if (el && canvasRef.current) {
            const elementCenterY = el.offsetTop + el.clientHeight / 2;
            const containerHeight = scrollContainerRef.current ? scrollContainerRef.current.clientHeight : window.innerHeight;
            const newY = (containerHeight / 2) - (elementCenterY * viewport.scale);

            setViewport(prev => ({
                ...prev,
                y: newY
            }));
        }
    };

    return (
        <div className="hidden md:flex w-24 bg-black/40 border-r border-white/5 flex-col items-center py-8 gap-4 shadow-2xl z-20 overflow-y-auto scrollbar-hide">
            <div className="text-[8px] font-black uppercase text-muted tracking-widest mb-2 opacity-50">Pages</div>
            {images.map((img, idx) => (
                <button
                    key={img.id}
                    onClick={() => handlePageClick(img)}
                    className={cn(
                        "group relative w-16 h-20 rounded-xl overflow-hidden border transition-all shrink-0 bg-surface shadow-lg",
                        activeImageId === img.id ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0a] scale-110 z-10" : "border-white/10 hover:border-primary"
                    )}
                >
                    <img
                        src={img.preview}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 flex items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-black text-white/50 group-hover:text-primary">{idx + 1}</span>
                    </div>
                    <div className="absolute inset-0 ring-2 ring-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
            ))}
        </div>
    );
});

EditorSidebarPages.displayName = 'EditorSidebarPages';
