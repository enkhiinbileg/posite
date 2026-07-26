'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GripVertical, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CompareSliderProps {
    original: string;
    translated: string;
    className?: string;
    isZenMode?: boolean;
    viewMode?: 'fit' | 'scroll';
}

export default function CompareSlider({ original, translated, className, isZenMode, viewMode = 'scroll' }: CompareSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPan = useRef({ x: 0, y: 0 });

    // Slider Logic
    const handleSliderMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!e.ctrlKey) return; // Allow page scroll unless Ctrl is active

        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(1, scale + delta), 20);

        if (newScale === 1) {
            setPosition({ x: 0, y: 0 });
        }

        setScale(newScale);
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 1, 20));
    const handleZoomOut = () => {
        setScale(prev => {
            const next = Math.max(1, prev - 0.5);
            if (next === 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    };
    const handleResetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    // Events
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsPanning(true);
            lastPan.current = { x: e.clientX, y: e.clientY };
        } else {
            // Check if ignoring slider clicks logic here? 
            // Actually, we bind slider move to the whole container IF scale is 1 (legacy behavior), 
            // OR strictly to the slider handle? 
            // Let's keep legacy: if scale=1, click anywhere moves slider.
            setIsDraggingSlider(true);
            handleSliderMove(e.clientX);
        }
    };

    const handleSliderMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation(); // Always prioritize slider drag if clicking the handle
        setIsDraggingSlider(true);
    };

    useEffect(() => {
        const handleMouseUp = () => { setIsDraggingSlider(false); setIsPanning(false); };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingSlider) {
                handleSliderMove(e.clientX);
            } else if (isPanning) {
                e.preventDefault();
                const deltaX = e.clientX - lastPan.current.x;
                const deltaY = e.clientY - lastPan.current.y;
                setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
                lastPan.current = { x: e.clientX, y: e.clientY };
            }
        };

        if (isDraggingSlider || isPanning) {
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isDraggingSlider, isPanning, scale]); // scale dependency to correct logic?

    return (
        <div
            ref={containerRef}
            className={cn("relative select-none overflow-hidden touch-none group/slider", className)}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {/* Movable Container for Pan/Zoom */}
            <div
                className={cn(
                    "w-full transition-transform duration-75 ease-out origin-center custom-cursor",
                    viewMode === 'fit' ? "absolute inset-0 h-full" : "relative h-auto"
                )}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    cursor: (scale > 1 && isPanning) ? 'grabbing' : (scale > 1 ? 'grab' : 'default')
                }}
            >
                {/* Translated Image (Base) */}
                <div className={cn("w-full transition-all", viewMode === 'fit' ? "absolute inset-0 h-full" : "relative h-auto")}>
                    {viewMode === 'fit' ? (
                        <Image
                            src={translated}
                            alt="Translated"
                            fill
                            className="object-contain"
                            priority
                            draggable={false}
                        />
                    ) : (
                        <Image
                            src={translated}
                            alt="Translated"
                            width={0}
                            height={0}
                            sizes="100vw"
                            className="w-full h-auto"
                            style={{ height: 'auto' }}
                            priority
                            draggable={false}
                        />
                    )}
                </div>

                {/* Original Image (Overlay) - Clipped */}
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                    <div className="relative w-full h-full">
                        {viewMode === 'fit' ? (
                            <Image
                                src={original}
                                alt="Original"
                                fill
                                className="object-contain"
                                priority
                                draggable={false}
                            />
                        ) : (
                            <Image
                                src={original}
                                alt="Original"
                                width={0}
                                height={0}
                                sizes="100vw"
                                className="w-full h-auto"
                                style={{ height: 'auto' }}
                                priority
                                draggable={false}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Static Labels (Stay fixed relative to viewport) */}
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-primary/20 backdrop-blur-md rounded text-[10px] font-black uppercase text-primary border border-primary/20 pointer-events-none z-10">
                Translated
            </div>
            <div
                className="absolute top-4 left-4 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] font-black uppercase text-white border border-white/10 pointer-events-none z-10"
                style={{ opacity: sliderPosition > 10 ? 1 : 0 }}
            >
                Original
            </div>

            {/* Slider Line (Fixed viewport X position, visual only) */}
            <div
                className="absolute inset-y-0 w-0.5 bg-white/50 hover:bg-white cursor-ew-resize z-20 hover:scale-x-150 transition-colors"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
            >
                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all backdrop-blur-sm opacity-0 group-hover/slider:opacity-100",
                    isDraggingSlider ? "scale-110 bg-white opacity-100 ring-4 ring-white/20" : ""
                )}>
                    <GripVertical className="w-4 h-4 text-black" />
                </div>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300">
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                    className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl hover:bg-primary/20 hover:border-primary/50 text-white transition-all active:scale-95"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                    className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl hover:bg-primary/20 hover:border-primary/50 text-white transition-all active:scale-95"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                {scale !== 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                        className="p-2 bg-red-500/20 backdrop-blur-md border border-red-500/20 rounded-xl hover:bg-red-500/50 text-red-500 hover:text-white transition-all active:scale-95 animate-in fade-in zoom-in"
                        title="Reset View"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Hints */}
            {isZenMode && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 pointer-events-none">
                    {scale > 1 ? (isPanning ? 'Panning' : 'Drag to Pan') : 'Scroll to Zoom'}
                </div>
            )}
        </div>
    );
}
