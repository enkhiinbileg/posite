import React from 'react';
import {
    X, RotateCcw, RotateCw, Type, Eraser, Crop,
    Wand2, Square, Blend, Droplet, ScanLine,
    Sparkles, Zap, CircleDashed, Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EditorSidebarLeftProps {
    onClose: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isTextToolActive: boolean;
    setIsTextToolActive: (v: boolean) => void;
    isEraserActive: boolean;
    setIsEraserActive: (v: boolean) => void;
    eraserSize: number;
    setEraserSize: (v: number) => void;
    isCropActive: boolean;
    setIsCropActive: (v: boolean) => void;
    isMagicWandActive: boolean;
    setIsMagicWandActive: (v: boolean) => void;
    magicWandMode: 'solid' | 'gradient';
    setMagicWandMode: (v: 'solid' | 'gradient') => void;
    magicWandThreshold: number;
    setMagicWandThreshold: (v: number) => void;
    isRectToolActive: boolean;
    setIsRectToolActive: (v: boolean) => void;
    isGradientActive: boolean;
    setIsGradientActive: (v: boolean) => void;
    isBlendActive: boolean;
    setIsBlendActive: (v: boolean) => void;
    blendSize: number;
    setBlendSize: (v: number) => void;
    blendStrength: number;
    setBlendStrength: (v: number) => void;
    isPatchActive: boolean;
    setIsPatchActive: (v: boolean) => void;
    isInpaintActive: boolean;
    setIsInpaintActive: (v: boolean) => void;
    isContextAwareActive: boolean;
    setIsContextAwareActive: (v: boolean) => void;
    onCleanAll: () => void;
    isCleaning: boolean;
    mode: 'cleaner' | 'translator';
}

export const EditorSidebarLeft = React.memo(({
    onClose,
    undo,
    redo,
    canUndo,
    canRedo,
    isTextToolActive,
    setIsTextToolActive,
    isEraserActive,
    setIsEraserActive,
    eraserSize,
    setEraserSize,
    isCropActive,
    setIsCropActive,
    isMagicWandActive,
    setIsMagicWandActive,
    magicWandMode,
    setMagicWandMode,
    magicWandThreshold,
    setMagicWandThreshold,
    isRectToolActive,
    setIsRectToolActive,
    isGradientActive,
    setIsGradientActive,
    isBlendActive,
    setIsBlendActive,
    blendSize,
    setBlendSize,
    blendStrength,
    setBlendStrength,
    isPatchActive,
    setIsPatchActive,
    isInpaintActive,
    setIsInpaintActive,
    isContextAwareActive,
    setIsContextAwareActive,
    onCleanAll,
    isCleaning,
    mode
}: EditorSidebarLeftProps) => {
    return (
        <div className="hidden md:flex w-20 bg-surface border-r border-white/5 flex-col items-center py-8 gap-4 shadow-2xl z-30 overflow-y-auto scrollbar-hide h-full flex-shrink-0">
            <button
                onClick={onClose}
                className="p-4 hover:bg-white/5 rounded-2xl text-muted hover:text-white transition-all mb-4"
            >
                <X className="w-6 h-6" />
            </button>

            {/* History Controls */}
            <div className="flex flex-col gap-2 mb-4 p-2 bg-white/5 rounded-2xl">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all disabled:opacity-30"
                    title="Undo (Ctrl+Z)"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <div className="h-[1px] bg-white/10 w-full" />
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all disabled:opacity-30"
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <RotateCw className="w-5 h-5" />
                </button>
            </div>

            <button
                onClick={() => {
                    setIsTextToolActive(!isTextToolActive);
                    setIsEraserActive(false);
                    setIsMagicWandActive(false);
                    setIsRectToolActive(false);
                }}
                className={cn(
                    "p-4 rounded-2xl shadow-lg transition-all",
                    isTextToolActive
                        ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                        : "bg-white/5 text-muted hover:text-white"
                )}
                title="Текст нэмэх (T)"
            >
                <Type className="w-6 h-6" />
            </button>

            {/* Eraser Toggle */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsEraserActive(!isEraserActive);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isEraserActive
                            ? "bg-white text-black shadow-white/20 scale-110 ring-2 ring-primary"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Eraser (Manual Clean)"
                >
                    <Eraser className="w-6 h-6" />
                </button>
                {isEraserActive && (
                    <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-2 w-full animate-in fade-in zoom-in">
                        <span className="text-[8px] uppercase font-black text-center text-muted">Size</span>
                        <input
                            type="range"
                            min="5" max="100"
                            value={eraserSize}
                            onChange={(e) => setEraserSize(Number(e.target.value))}
                            className="w-full h-1 accent-primary bg-white/10 rounded-full"
                        />
                    </div>
                )}
            </div>

            <button
                onClick={() => {
                    setIsCropActive(!isCropActive);
                    setIsEraserActive(false);
                    setIsTextToolActive(false);
                    setIsMagicWandActive(false);
                    setIsRectToolActive(false);
                    setIsGradientActive(false);
                    setIsBlendActive(false);
                }}
                className={cn(
                    "p-4 rounded-2xl shadow-lg transition-all",
                    isCropActive
                        ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                        : "bg-white/5 text-muted hover:text-white"
                )}
                title="Crop Tool (C)"
            >
                <Crop className="w-6 h-6" />
            </button>

            {/* Magic Wand */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsMagicWandActive(!isMagicWandActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsRectToolActive(false);
                        setIsBlendActive(false);
                        setIsGradientActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isMagicWandActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Magic Wand (W) - Auto-detect bubble"
                >
                    <Wand2 className="w-6 h-6" />
                </button>
                {isMagicWandActive && (
                    <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-3 w-full animate-in fade-in zoom-in">
                        <div className="flex bg-black/40 rounded-lg p-0.5">
                            <button
                                onClick={() => setMagicWandMode('solid')}
                                className={cn(
                                    "flex-1 py-1.5 text-[8px] font-black uppercase rounded-md transition-all",
                                    magicWandMode === 'solid' ? "bg-primary text-white" : "text-muted hover:text-white"
                                )}
                            >
                                Solid
                            </button>
                            <button
                                onClick={() => setMagicWandMode('gradient')}
                                className={cn(
                                    "flex-1 py-1.5 text-[8px] font-black uppercase rounded-md transition-all",
                                    magicWandMode === 'gradient' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-white"
                                )}
                            >
                                Gradient
                            </button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[8px] uppercase font-black text-muted">Radius</span>
                                <span className="text-[8px] font-black text-primary">{magicWandThreshold}</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="100"
                                value={magicWandThreshold}
                                onChange={(e) => setMagicWandThreshold(Number(e.target.value))}
                                className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Rect Tool */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsRectToolActive(!isRectToolActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isRectToolActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Rect Tool (R) - Select region to clean"
                >
                    <Square className="w-6 h-6" />
                </button>
            </div>

            {/* Gradient Tool */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsGradientActive(!isGradientActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsBlendActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isGradientActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Gradient Tool (G) - Draw gradient blend"
                >
                    <Blend className="w-6 h-6" />
                </button>
            </div>

            {/* Blend Tool */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsBlendActive(!isBlendActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isBlendActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Blend Tool (B) - Blur/Blend colors"
                >
                    <Droplet className="w-6 h-6" />
                </button>
                {isBlendActive && (
                    <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-2 w-full animate-in fade-in zoom-in">
                        <span className="text-[8px] uppercase font-black text-center text-muted">Size</span>
                        <input
                            type="range"
                            min="10" max="100"
                            value={blendSize}
                            onChange={(e) => setBlendSize(Number(e.target.value))}
                            className="w-full h-1 accent-primary bg-white/10 rounded-full"
                        />
                        <span className="text-[8px] font-black text-center text-primary">{blendSize}px</span>
                        <span className="text-[8px] uppercase font-black text-center text-muted mt-2">Strength</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.1"
                            value={blendStrength}
                            onChange={(e) => setBlendStrength(Number(e.target.value))}
                            className="w-full h-1 accent-primary bg-white/10 rounded-full"
                        />
                        <span className="text-[8px] font-black text-center text-primary">{Math.round(blendStrength * 100)}%</span>
                    </div>
                )}
            </div>

            {/* Patch Tool */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsPatchActive(!isPatchActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                        setIsInpaintActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isPatchActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Patch Tool (P) - Photoshop style cloning"
                >
                    <ScanLine className="w-6 h-6" />
                </button>
            </div>

            {/* Smart Inpaint Tool */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsInpaintActive(!isInpaintActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                        setIsPatchActive(false);
                        setIsContextAwareActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isInpaintActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Smart Inpaint (AI) - Content-Aware Fill"
                >
                    <Sparkles className="w-6 h-6" />
                </button>
            </div>

            {/* Context Aware Fill Tool (LaMa ONNX) */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => {
                        setIsContextAwareActive(!isContextAwareActive);
                        setIsInpaintActive(false);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                        setIsPatchActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isContextAwareActive
                            ? "bg-purple-600 text-white shadow-purple-900/40 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Context-Aware Fill (LaMa ONNX)"
                >
                    <Zap className="w-6 h-6" />
                </button>
            </div>

            <div className="w-8 h-[1px] bg-white/5 my-2" />

            <button
                onClick={onCleanAll}
                disabled={isCleaning}
                className={cn(
                    "p-4 rounded-2xl transition-all",
                    isCleaning ? "bg-white/5 animate-pulse" : "bg-white/5 hover:bg-white/10 text-primary"
                )}
                title={mode === 'cleaner' ? "Бүх зургийг AI-аар цэвэрлэх" : "AI Орчуулга эхлүүлэх"}
            >
                {isCleaning ? (
                    <CircleDashed className="w-6 h-6 animate-spin" />
                ) : (
                    mode === 'cleaner' ? <Wand2 className="w-6 h-6" /> : <Languages className="w-6 h-6" />
                )}
            </button>
        </div>
    );
});

EditorSidebarLeft.displayName = 'EditorSidebarLeft';
