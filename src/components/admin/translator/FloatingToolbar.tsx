import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Bold, Italic, Trash2, Palette, Eraser, Type, MousePointer2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
    visible: boolean;
    activeTool: string;
    selectedObject: any | null;
    onUpdateObject: (id: string, updates: any) => void;
    onDeleteObject: (id: string) => void;
    onUpdateToolSettings: (key: string, value: any) => void;
    toolSettings: {
        eraserSize: number;
        brushSize?: number;
        opacity?: number;
    };
}

export function FloatingToolbar({
    visible,
    activeTool, selectedObject,
    onUpdateObject, onDeleteObject,
    onUpdateToolSettings, toolSettings,
    anchorPosition
}: FloatingToolbarProps & { anchorPosition?: { x: number, y: number } }) {

    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (anchorPosition) return; // Don't track mouse if anchored

        const handleMove = (e: MouseEvent) => {
            requestAnimationFrame(() => {
                setPos({ x: e.clientX, y: e.clientY });
            });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [anchorPosition]);

    // Priority: Anchor > Mouse Position
    // If anchored (Text), center it. If mouse (Eraser), offset slightly.
    const style = anchorPosition ? {
        left: anchorPosition.x,
        top: anchorPosition.y - 60, // Above the object
        transform: 'translateX(-50%)' // Center horizontally
    } : {
        left: pos.x + 20,
        top: pos.y + 20,
    };

    if (!visible) return null;

    // Determine if we should show anything
    const shouldShow = activeTool === 'eraser' || selectedObject;

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed z-[100] p-2 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto"
                    style={style}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* TOOL SPECIFIC CONTROLS */}

                    {/* Eraser / Cleaner Controls */}
                    {activeTool === 'eraser' && (
                        <>
                            <div className="flex items-center gap-2 px-2">
                                <Eraser className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-bold uppercase text-muted">Size</span>
                                <input
                                    type="range"
                                    min="5" max="100"
                                    value={toolSettings.eraserSize}
                                    onChange={(e) => onUpdateToolSettings('eraserSize', Number(e.target.value))}
                                    className="w-24 h-1 accent-primary bg-white/10 rounded-full cursor-pointer"
                                />
                                <span className="text-[10px] w-6 font-bold">{toolSettings.eraserSize}px</span>
                            </div>
                        </>
                    )}

                    {/* Text Selection Controls */}
                    {selectedObject && (
                        <>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onUpdateObject(selectedObject.id, { fontSize: Math.max(8, selectedObject.fontSize - 2) })}
                                    className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-muted min-w-[20px] text-center select-none">{Math.round(selectedObject.fontSize)}</span>
                                <button
                                    onClick={() => onUpdateObject(selectedObject.id, { fontSize: Math.min(200, selectedObject.fontSize + 2) })}
                                    className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="w-[1px] h-4 bg-white/10 mx-1" />

                            <button
                                onClick={() => onUpdateObject(selectedObject.id, { fontWeight: selectedObject.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                className={cn("p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors", selectedObject.fontWeight === 'bold' && "text-white bg-white/10")}
                            >
                                <Bold className="w-3 h-3" />
                            </button>

                            <button
                                onClick={() => onUpdateObject(selectedObject.id, { fontStyle: selectedObject.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                className={cn("p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors", selectedObject.fontStyle === 'italic' && "text-white bg-white/10")}
                            >
                                <Italic className="w-3 h-3" />
                            </button>

                            <div className="w-[1px] h-4 bg-white/10 mx-1" />

                            <button
                                onClick={() => onDeleteObject(selectedObject.id)}
                                className="p-2 hover:bg-red-500/20 rounded-xl text-muted hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
