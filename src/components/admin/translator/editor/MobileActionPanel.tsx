import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import {
    Sparkles, Square, Crop, ScanLine, Eraser, Droplet, Layers, X, Eye,
    Minimize2, Maximize2, RotateCcw, Sliders, Languages, Trash2, LayoutGrid,
    Type, Brush, RotateCw, Minus, Plus, Star, Check, ArrowLeft, ChevronDown,
    AlignLeft, AlignCenter, AlignRight, Bold
} from 'lucide-react';
import { NavBtn, ToolBtn } from './EditorUI';
import { TextObject, EraserObject, ImageItem, ActiveTabType, StyleSubTabType } from './types';

interface MobileActionPanelProps {
    isPreviewMode: boolean;
    selectedId: string | null;
    isMobileScriptOpen: boolean;
    setIsMobileScriptOpen: (open: boolean) => void;
    isMagicWandActive: boolean;
    setIsMagicWandActive: (active: boolean) => void;
    isEraserActive: boolean;
    setIsEraserActive: (active: boolean) => void;
    isBlendActive: boolean;
    setIsBlendActive: (active: boolean) => void;
    magicWandThreshold: number;
    setMagicWandThreshold: (val: number) => void;
    eraserSize: number;
    setEraserSize: (val: number) => void;
    blendSize: number;
    setBlendSize: (val: number) => void;
    selectedObject: TextObject | null;
    styleSubTab: StyleSubTabType;
    setStyleSubTab: (tab: StyleSubTabType) => void;
    updateObject: (id: string, updates: Partial<TextObject>) => void;
    deleteObject: (id: string) => void;
    FONTS: any[];
    expandedFamily: string | null;
    setExpandedFamily: (family: string | null) => void;
    groupedFonts: any[];
    isManagingFonts: boolean;
    favorites: string[];
    toggleFavorite: (name: string) => void;
    defaultFont: string;
    setDefaultFont: (name: string) => void;
    setIsFontModalOpen: (open: boolean) => void;
    mobileMode: 'tools' | 'fx' | 'text' | 'stickers' | 'draw' | 'view';
    setMobileMode: (mode: 'tools' | 'fx' | 'text' | 'stickers' | 'draw' | 'view') => void;
    isRectToolActive: boolean;
    setIsRectToolActive: (active: boolean) => void;
    isCropActive: boolean;
    setIsCropActive: (active: boolean) => void;
    isOCREnabled: boolean;
    setIsOCREnabled: (active: boolean) => void;
    setActiveTab: (tab: ActiveTabType) => void;
    activeTab: ActiveTabType;
    viewport: { x: number; y: number; scale: number };
    setViewport: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number }>>;
    images: ImageItem[];
    addText: (imageId: string, x: number, y: number) => void;
    undo: () => void;
    redo: () => void;
}

export const MobileActionPanel = ({
    isPreviewMode,
    selectedId,
    isMobileScriptOpen,
    setIsMobileScriptOpen,
    isMagicWandActive,
    setIsMagicWandActive,
    isEraserActive,
    setIsEraserActive,
    isBlendActive,
    setIsBlendActive,
    magicWandThreshold,
    setMagicWandThreshold,
    eraserSize,
    setEraserSize,
    blendSize,
    setBlendSize,
    selectedObject,
    styleSubTab,
    setStyleSubTab,
    updateObject,
    deleteObject,
    FONTS,
    expandedFamily,
    setExpandedFamily,
    groupedFonts,
    isManagingFonts,
    favorites,
    toggleFavorite,
    defaultFont,
    setDefaultFont,
    setIsFontModalOpen,
    mobileMode,
    setMobileMode,
    isRectToolActive,
    setIsRectToolActive,
    isCropActive,
    setIsCropActive,
    isOCREnabled,
    setIsOCREnabled,
    setActiveTab,
    activeTab,
    viewport,
    setViewport,
    images,
    addText,
    undo,
    redo
}: MobileActionPanelProps) => {
    return (
        <AnimatePresence>
            {(!isPreviewMode) && (
                <motion.div
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 200, opacity: 0 }}
                    className="md:hidden fixed bottom-2 left-2 right-2 z-50 pointer-events-none"
                >
                    <motion.div
                        layout
                        className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto transition-all duration-500 ease-[0.22,1,0.36,1]"
                        style={{
                            maxHeight: (selectedId && !isMobileScriptOpen) || isMagicWandActive || isEraserActive || isBlendActive ? '60vh' : 'auto'
                        }}
                    >
                        {/* Drag Indicator */}
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 cursor-pointer" />

                        <div className={cn("px-2 pb-safe transition-all duration-300", "h-auto opacity-100")}>
                            {/* CONTEXTUAL SETTINGS PANEL */}
                            <AnimatePresence mode="wait">
                                {isMagicWandActive && (
                                    <motion.div key="magic-wand-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                            <span>Cleaning Power</span>
                                            <span className="text-primary bg-primary/10 px-2 py-1 rounded-lg">{magicWandThreshold}</span>
                                        </div>
                                        <div className="flex items-center gap-4 pb-2">
                                            <button onClick={() => setMagicWandThreshold(Math.max(1, magicWandThreshold - 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                            <input type="range" min="1" max="150" value={magicWandThreshold} onChange={(e) => setMagicWandThreshold(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                            <button onClick={() => setMagicWandThreshold(Math.min(150, magicWandThreshold + 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </motion.div>
                                )}

                                {isEraserActive && (
                                    <motion.div key="eraser-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                            <span>Eraser Size</span>
                                            <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{eraserSize}px</span>
                                        </div>
                                        <div className="flex items-center gap-4 pb-2">
                                            <button onClick={() => setEraserSize(Math.max(5, eraserSize - 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                            <input type="range" min="5" max="100" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                            <button onClick={() => setEraserSize(Math.min(100, eraserSize + 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </motion.div>
                                )}

                                {isBlendActive && (
                                    <motion.div key="blend-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                            <span>Blend Size</span>
                                            <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{blendSize}px</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setBlendSize(Math.max(10, blendSize - 10))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                            <input type="range" min="10" max="100" value={blendSize} onChange={(e) => setBlendSize(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                            <button onClick={() => setBlendSize(Math.min(100, blendSize + 10))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </motion.div>
                                )}

                                {selectedObject && !isEraserActive && !isMagicWandActive && !isBlendActive && !isMobileScriptOpen && (
                                    <motion.div key="text-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-1 space-y-4 max-h-[45vh] overflow-y-auto scrollbar-hide pb-6">
                                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 sticky top-0 bg-black/5 backdrop-blur-md z-10 -mx-6 px-6 border-b border-white/5">
                                            {[
                                                { id: 'basic', label: 'Загвар' },
                                                { id: 'stroke', label: 'Хүрээ' },
                                                { id: 'shadow', label: 'Сүүдэр' },
                                                { id: 'opacity', label: 'Тунгалаг' },
                                                { id: 'spacing', label: 'Зай' },
                                                { id: 'canvas', label: 'Фон' }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={(e) => { e.stopPropagation(); setStyleSubTab(tab.id as any); }}
                                                    className={cn(
                                                        "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                                                        styleSubTab === tab.id ? "bg-primary text-white shadow-[0_4px_12px_rgba(var(--primary),0.3)]" : "bg-white/5 text-muted hover:bg-white/10"
                                                    )}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                            {styleSubTab === 'basic' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                            <span>Фонт сонгох</span>
                                                            <span className="text-primary">{FONTS.find(f => f.value === selectedObject.fontFamily)?.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                            {expandedFamily ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => setExpandedFamily(null)}
                                                                        className="flex-shrink-0 h-[60px] px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-all mr-2"
                                                                    >
                                                                        <ArrowLeft className="w-4 h-4" />
                                                                        <span className="text-[10px] font-bold uppercase">Back</span>
                                                                    </button>
                                                                    {groupedFonts.find(g => g.family === expandedFamily)?.variants.map((f: any) => (
                                                                        <div key={f.name} className="relative group/fontbtn flex-shrink-0">
                                                                            <button
                                                                                onClick={() => updateObject(selectedObject!.id, {
                                                                                    fontFamily: f.value,
                                                                                    fontWeight: (f as any).weight || 'normal',
                                                                                    fontStyle: (f as any).style || 'normal'
                                                                                })}
                                                                                disabled={isManagingFonts}
                                                                                className={cn(
                                                                                    "min-w-[100px] h-[60px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2",
                                                                                    selectedObject.fontFamily === f.value &&
                                                                                        (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') &&
                                                                                        (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal')
                                                                                        ? "bg-primary/20 border-primary text-primary"
                                                                                        : "bg-white/5 border-white/5 text-muted hover:bg-white/10",
                                                                                    isManagingFonts && "opacity-50 pointer-events-none"
                                                                                )}
                                                                            >
                                                                                <span className="text-[14px] leading-none" style={{ fontFamily: f.value }}>Aa</span>
                                                                                <span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name.replace(expandedFamily, '').trim() || 'Regular'}</span>
                                                                            </button>
                                                                            {!isManagingFonts && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleFavorite(f.name);
                                                                                        }}
                                                                                        className={cn(
                                                                                            "absolute top-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-full",
                                                                                            favorites.includes(f.name) ? "text-yellow-400" : "text-white/20 hover:text-white"
                                                                                        )}
                                                                                    >
                                                                                        <Star className={cn("w-2.5 h-2.5", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDefaultFont(f.value);
                                                                                        }}
                                                                                        className={cn(
                                                                                            "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                            defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white"
                                                                                        )}
                                                                                    >
                                                                                        <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                groupedFonts.map(({ family, variants }) => {
                                                                    if (variants.length === 1) {
                                                                        const f = variants[0];
                                                                        return (
                                                                            <div key={f.name} className="relative group/fontbtn flex-shrink-0">
                                                                                <button onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    updateObject(selectedObject.id, {
                                                                                        fontFamily: f.value,
                                                                                        fontWeight: (f as any).weight || 'normal',
                                                                                        fontStyle: (f as any).style || 'normal'
                                                                                    })
                                                                                }} className={cn("min-w-[100px] h-[60px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2", selectedObject.fontFamily === f.value && (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') && (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal') ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted hover:bg-white/10")}><span className="text-[14px] leading-none" style={{ fontFamily: f.value }}>Aa</span><span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name}</span></button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleFavorite(f.name);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "absolute top-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-full",
                                                                                        favorites.includes(f.name) ? "text-yellow-400" : "text-white/20 hover:text-white"
                                                                                    )}
                                                                                >
                                                                                    <Star className={cn("w-2.5 h-2.5", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setDefaultFont(f.value);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                        defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white"
                                                                                    )}
                                                                                >
                                                                                    <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <button
                                                                            key={family}
                                                                            onClick={() => setExpandedFamily(family)}
                                                                            className="flex-shrink-0 min-w-[100px] h-[60px] rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-1 p-2 group"
                                                                        >
                                                                            <span className="text-[14px] leading-none" style={{ fontFamily: variants[0].value }}>Aa</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-[8px] font-bold uppercase truncate max-w-[80px] text-center group-hover:text-white text-muted">{family}</span>
                                                                                <ChevronDown className="w-3 h-3 text-muted" />
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setIsFontModalOpen(true); }}
                                                                className="flex-shrink-0 min-w-[60px] h-[60px] rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-muted hover:text-primary transition-all flex flex-col items-center justify-center gap-1"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                                <span className="text-[8px] font-bold uppercase">More</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                            <span>Текст хэмжээ</span>
                                                            <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.fontSize}px</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontSize: Math.max(8, selectedObject.fontSize - 2) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                            <input type="range" min="8" max="200" value={selectedObject.fontSize} onChange={(e) => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontSize: Math.min(300, selectedObject.fontSize + 2) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 bg-white/5 p-4 rounded-[2rem] border border-white/5">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                            <span>Текст өргөн (Width)</span>
                                                            <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{Math.round(selectedObject.width)}px</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { width: Math.max(20, selectedObject.width - 20) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                            <input type="range" min="20" max="2000" value={selectedObject.width} onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { width: Math.min(3000, selectedObject.width + 20) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                        <div className="h-[1px] bg-white/5 w-full my-2" />
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                            <span>Мөр хоорондын зай</span>
                                                            <span className="text-primary">{selectedObject.lineHeight || 1.1}</span>
                                                        </div>
                                                        <input type="range" min="0.5" max="3" step="0.1" value={selectedObject.lineHeight || 1.1} onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1 mt-2">
                                                            <span>Үсэг хоорондын зай</span>
                                                            <span className="text-primary">{selectedObject.letterSpacing || 0}px</span>
                                                        </div>
                                                        <input type="range" min="-5" max="20" step="0.5" value={selectedObject.letterSpacing || 0} onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">
                                                            {selectedObject.gradientEnabled ? "Нэг дэх өнгө" : "Текст өнгө"}
                                                        </label>
                                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                            {['#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#AF52DE', '#FF9500', '#5856D6', '#8E8E93'].map(c => (
                                                                <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { color: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all", selectedObject.color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c }} />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 bg-white/5 p-4 rounded-[2rem] border border-white/5">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Gradient</label>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { gradientEnabled: !selectedObject.gradientEnabled }) }}
                                                                className={cn("w-10 h-5 rounded-full transition-all relative", selectedObject.gradientEnabled ? "bg-primary" : "bg-white/10")}
                                                            >
                                                                <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", selectedObject.gradientEnabled ? "left-6" : "left-1")} />
                                                            </button>
                                                        </div>

                                                        {selectedObject.gradientEnabled && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Хоёр дахь өнгө</label>
                                                                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                        {['#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#AF52DE', '#FF9500', '#5856D6', '#8E8E93'].map(c => (
                                                                            <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { color2: c }) }} className={cn("w-10 h-10 rounded-2xl flex-shrink-0 border-2 transition-all", selectedObject.color2 === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c }} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                        <span>Чиглэл (Angle)</span>
                                                                        <span className="text-primary">{selectedObject.gradientAngle || 180}°</span>
                                                                    </div>
                                                                    <input type="range" min="0" max="360" value={selectedObject.gradientAngle || 180} onChange={(e) => updateObject(selectedObject.id, { gradientAngle: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[{ id: 'left', icon: AlignLeft }, { id: 'center', icon: AlignCenter }, { id: 'right', icon: AlignRight }].map(align => (
                                                            <button key={align.id} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { textAlign: align.id as any }) }} className={cn("p-4 rounded-2xl transition-all", selectedObject.textAlign === align.id ? "bg-primary text-white" : "bg-white/5 text-muted")}> <align.icon className="w-5 h-5 mx-auto" /> </button>
                                                        ))}
                                                        <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontWeight: selectedObject.fontWeight === '900' ? '400' : '900' }) }} className={cn("p-4 rounded-2xl transition-all", selectedObject.fontWeight === '900' ? "bg-primary text-white" : "bg-white/5 text-muted")}> <Bold className="w-5 h-5 mx-auto" /> </button>
                                                    </div>
                                                </div>
                                            )}
                                            {styleSubTab === 'stroke' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"> <span>Зузаан</span> <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.strokeWidth}</span> </div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeWidth: Math.max(0, (selectedObject.strokeWidth || 0) - 1) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"><Minus className="w-4 h-4" /></button>
                                                            <input type="range" min="0" max="30" value={selectedObject.strokeWidth || 0} onChange={(e) => updateObject(selectedObject.id, { strokeWidth: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeWidth: Math.min(50, (selectedObject.strokeWidth || 0) + 1) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний өнгө</label>
                                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                            {['transparent', '#000000', '#FFFFFF', '#FF3B30', '#34C759', '#007AFF', '#FFCC00'].map(c => (
                                                                <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeColor: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all flex items-center justify-center", selectedObject.strokeColor === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>{c === 'transparent' && <X className="w-4 h-4 text-red-500" />}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {styleSubTab === 'shadow' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Blur</span><span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.shadowBlur || 0}</span></div>
                                                        <input type="range" min="0" max="40" value={selectedObject.shadowBlur || 0} onChange={(e) => updateObject(selectedObject.id, { shadowBlur: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-3">
                                                            <label className="text-[9px] font-bold text-muted uppercase">Offset X</label>
                                                            <input type="range" min="-20" max="20" value={selectedObject.shadowOffsetX || 0} onChange={(e) => updateObject(selectedObject.id, { shadowOffsetX: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[9px] font-bold text-muted uppercase">Offset Y</label>
                                                            <input type="range" min="-20" max="20" value={selectedObject.shadowOffsetY || 0} onChange={(e) => updateObject(selectedObject.id, { shadowOffsetY: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {styleSubTab === 'opacity' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Opacity</span><span className="text-white bg-white/10 px-2 py-1 rounded-lg">{Math.round((selectedObject.opacity || 1) * 100)}%</span></div>
                                                        <input type="range" min="0" max="1" step="0.05" value={selectedObject.opacity ?? 1} onChange={(e) => updateObject(selectedObject.id, { opacity: Number(e.target.value) })} className="w-full h-2 accent-primary bg-white/10 rounded-full appearance-none" />
                                                    </div>
                                                </div>
                                            )}
                                            {styleSubTab === 'spacing' && (
                                                <div className="space-y-8">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Мөр хоорондын зай</span><span className="text-primary">{selectedObject.lineHeight}</span></div>
                                                        <input type="range" min="0.5" max="3" step="0.1" value={selectedObject.lineHeight} onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Үсэг хоорондын зай</span><span className="text-primary">{selectedObject.letterSpacing}px</span></div>
                                                        <input type="range" min="-5" max="20" value={selectedObject.letterSpacing} onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                    </div>
                                                </div>
                                            )}
                                            {styleSubTab === 'canvas' && (
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <label className="text-[9px] font-bold text-muted uppercase flex justify-between"><span>Бөөрөнхий</span> <span>{selectedObject.bgBorderRadius || 0}</span></label>
                                                            <input type="range" min="0" max="100" value={selectedObject.bgBorderRadius || 0} onChange={(e) => updateObject(selectedObject.id, { bgBorderRadius: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[9px] font-bold text-muted uppercase flex justify-between"><span>Зай (Padding)</span> <span>{selectedObject.bgPaddingX || 0}</span></label>
                                                            <input type="range" min="0" max="50" value={selectedObject.bgPaddingX || 0} onChange={(e) => updateObject(selectedObject.id, { bgPaddingX: Number(e.target.value), bgPaddingY: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">Дэвсгэр өнгө</label>
                                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                            {['transparent', '#000000', '#FFFFFF', '#FF3B30', '#34C759', '#FFD60A'].map(c => (
                                                                <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { backgroundColor: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all flex items-center justify-center", selectedObject.backgroundColor === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>{c === 'transparent' && <X className="w-4 h-4 text-red-500" />}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* MODE INDICATOR BAR */}
                            {!selectedId && !isMagicWandActive && !isEraserActive && !isBlendActive && (
                                <div className="flex items-center justify-center h-8 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">
                                        {mobileMode === 'tools' && 'Precision Tools'}
                                        {mobileMode === 'fx' && 'Special Effects'}
                                        {mobileMode === 'text' && 'Typography'}
                                        {mobileMode === 'draw' && 'Expert Drawing'}
                                        {mobileMode === 'view' && 'Viewport'}
                                    </span>
                                </div>
                            )}

                            {/* PRIMARY NAVIGATION / TOOLBAR */}
                            <div className="p-2 pt-0 pb-2">
                                <div className="flex flex-col gap-1">
                                    {/* SUB-BAR */}
                                    <AnimatePresence>
                                        {!selectedId && mobileMode !== 'text' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 h-16 border-b border-white/5 mb-1"
                                            >
                                                {mobileMode === 'tools' && (
                                                    <>
                                                        <ToolBtn active={isMagicWandActive} icon={Sparkles} label="Magic" onClick={() => { setIsMagicWandActive(!isMagicWandActive); setIsEraserActive(false); setIsRectToolActive(false); }} />
                                                        <ToolBtn active={isRectToolActive} icon={Square} label="Rect" onClick={() => { setIsRectToolActive(!isRectToolActive); setIsMagicWandActive(false); setIsEraserActive(false); }} />
                                                        <ToolBtn active={isCropActive} icon={Crop} label="Crop" onClick={() => setIsCropActive(!isCropActive)} />
                                                        <ToolBtn active={isOCREnabled} icon={ScanLine} label="OCR" onClick={() => setIsOCREnabled(!isOCREnabled)} />
                                                    </>
                                                )}
                                                {mobileMode === 'draw' && (
                                                    <>
                                                        <ToolBtn active={isEraserActive} icon={Eraser} label="Eraser" onClick={() => { setIsEraserActive(!isEraserActive); setIsMagicWandActive(false); setIsRectToolActive(false); }} />
                                                        <ToolBtn active={isBlendActive} icon={Droplet} label="Blend" onClick={() => setIsBlendActive(!isBlendActive)} />
                                                        <ToolBtn active={activeTab === 'layers'} icon={Layers} label="Layers" onClick={() => setActiveTab('layers')} />
                                                    </>
                                                )}
                                                {mobileMode === 'view' && (
                                                    <>
                                                        <ToolBtn icon={isPreviewMode ? X : Eye} label={isPreviewMode ? "Edit" : "Preview"} onClick={() => isPreviewMode ? console.log("Edit") : console.log("Preview")} />
                                                        <ToolBtn icon={Minimize2} label="Out" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.2) }))} />
                                                        <ToolBtn icon={Maximize2} label="In" onClick={() => setViewport(v => ({ ...v, scale: Math.min(10, v.scale + 0.2) }))} />
                                                        <ToolBtn icon={RotateCcw} label="Reset" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} />
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* MAIN CATEGORIES */}
                                    <div className="flex items-center w-max min-w-full px-2 gap-3 overflow-x-auto scrollbar-hide">
                                        {selectedId ? (
                                            <div className="flex items-center gap-1 w-full justify-around py-1">
                                                <NavBtn icon={X} label="Close" onClick={() => deleteObject(selectedId)} />
                                                <div className="w-px h-10 bg-white/10 mx-1" />
                                                <NavBtn active={activeTab === 'style'} icon={Sliders} label="Style" onClick={() => setActiveTab('style')} highlight />
                                                <NavBtn icon={Languages} label="Script" onClick={() => setIsMobileScriptOpen(true)} />
                                                <NavBtn icon={Trash2} label="Delete" onClick={() => deleteObject(selectedId)} danger />
                                            </div>
                                        ) : (
                                            <>
                                                <NavBtn active={mobileMode === 'tools'} icon={LayoutGrid} label="Tools" onClick={() => setMobileMode('tools')} />
                                                <NavBtn active={mobileMode === 'fx'} icon={Sparkles} label="FX" onClick={() => setMobileMode('fx')} />
                                                <NavBtn
                                                    active={mobileMode === 'text'}
                                                    icon={Type} label="Text"
                                                    onClick={() => {
                                                        if (mobileMode === 'text') {
                                                            const activeImg = images.find(i => {
                                                                const el = document.getElementById(`img-el-${i.id}`);
                                                                if (!el) return false;
                                                                const r = el.getBoundingClientRect();
                                                                return r.top < window.innerHeight && r.bottom > 0;
                                                            }) || images[0];
                                                            if (activeImg) {
                                                                const el = document.getElementById(`img-el-${activeImg.id}`);
                                                                const rect = el?.getBoundingClientRect();
                                                                const cx = rect ? (window.innerWidth / 2 - rect.left) / viewport.scale : 100;
                                                                const cy = rect ? (window.innerHeight / 3 - rect.top) / viewport.scale : 100;
                                                                addText(activeImg.id, Math.round(cx), Math.round(cy));
                                                            }
                                                        } else {
                                                            setMobileMode('text');
                                                        }
                                                    }}
                                                />
                                                <NavBtn active={mobileMode === 'draw'} icon={Brush} label="Draw" onClick={() => setMobileMode('draw')} />
                                                <NavBtn active={mobileMode === 'view'} icon={Maximize2} label="View" onClick={() => setMobileMode('view')} />
                                                <div className="w-px h-8 bg-white/10 mx-2" />
                                                <button onClick={undo} className="p-3 text-muted active:text-white transition-colors"> <RotateCcw className="w-5 h-5" /> </button>
                                                <button onClick={redo} className="p-3 text-muted active:text-white transition-colors"> <RotateCw className="w-5 h-5" /> </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
