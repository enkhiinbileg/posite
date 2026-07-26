import React, { useMemo } from 'react';
import { cn } from '../../../../lib/utils';
import {
    Type, X, Plus, Trash2, MousePointer2, Move, AlignLeft, AlignCenter, AlignRight,
    Bold, Minus, Eye, EyeOff, Star, ChevronDown, Check, ArrowLeft, ScanLine, Sparkles,
    Maximize2, Square, Ghost, Layout, Sliders
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TextObject, ActiveTabType, StyleSubTabType } from './types';
import { FONTS } from './constants';

interface StylePanelProps {
    selectedObject: TextObject | null;
    updateObject: (id: string, updates: Partial<TextObject>) => void;
    deleteObject: (id: string) => void;
    activeTab: ActiveTabType;
    styleSubTab: StyleSubTabType;
    setStyleSubTab: (tab: StyleSubTabType) => void;
    localFonts: typeof FONTS;
    favorites: string[];
    toggleFavorite: (fontFamily: string) => void;
    expandedFamily: string | null;
    setExpandedFamily: (family: string | null) => void;
    setIsFontModalOpen: (open: boolean) => void;
    isManagingFonts: boolean;
    defaultFont: string;
    setDefaultFont: (font: string) => void;
}

export const StylePanel = ({
    selectedObject, updateObject, deleteObject, activeTab,
    styleSubTab, setStyleSubTab, localFonts, favorites,
    toggleFavorite, expandedFamily, setExpandedFamily,
    setIsFontModalOpen, isManagingFonts, defaultFont, setDefaultFont
}: StylePanelProps) => {

    const sortedFonts = useMemo(() => {
        return [...localFonts].sort((a, b) => {
            const aFav = favorites.includes(a.name);
            const bFav = favorites.includes(b.name);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return 0;
        });
    }, [localFonts, favorites]);

    const groupedFonts = useMemo(() => {
        const groups: Record<string, typeof FONTS> = {};
        sortedFonts.forEach(f => {
            const family = (f as any).family || f.name;
            if (!groups[family]) groups[family] = [];
            groups[family].push(f);
        });
        return Object.entries(groups).map(([family, variants]) => ({ family, variants }));
    }, [sortedFonts]);

    if (activeTab !== 'style') return null;

    if (!selectedObject) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30 mt-20">
                <Move className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-widest">Обьект сонгож загварыг нь засварлана уу</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Style Editor</h2>

            {/* TAB SYSTEM */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'basic', icon: Type, label: 'Font' },
                    { id: 'stroke', icon: Square, label: 'Stroke' },
                    { id: 'shadow', icon: Ghost, label: 'Shadow' },
                    { id: 'canvas', icon: Layout, label: 'Canvas' },
                    { id: 'spacing', icon: Sliders, label: 'Spacing' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStyleSubTab(tab.id as any)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 whitespace-nowrap",
                            styleSubTab === tab.id ? "bg-primary text-white shadow-lg" : "text-muted hover:text-white"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="pt-2">
                {styleSubTab === 'basic' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                        {/* FONT FAMILY */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Фонт сонгох</label>
                            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                {expandedFamily ? (
                                    <>
                                        <button
                                            onClick={() => setExpandedFamily(null)}
                                            className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase transition-all mb-1"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Буцах
                                        </button>
                                        {groupedFonts.find(g => g.family === expandedFamily)?.variants.map(f => (
                                            <div key={f.name} className="relative group/fontbtn">
                                                <button
                                                    onClick={() => updateObject(selectedObject.id, {
                                                        fontFamily: f.value,
                                                        fontWeight: (f as any).weight || 'normal',
                                                        fontStyle: (f as any).style || 'normal'
                                                    })}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border transition-all flex flex-col items-center gap-1",
                                                        selectedObject.fontFamily === f.value && (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="text-xl" style={{ fontFamily: f.value }}>Aa</span>
                                                    <span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name.replace(expandedFamily, '').trim() || 'Regular'}</span>
                                                </button>
                                                <button onClick={() => toggleFavorite(f.name)} className={cn("absolute top-1 right-1 p-1 text-muted hover:text-yellow-400 transition-colors", favorites.includes(f.name) && "text-yellow-400")}>
                                                    <Star className={cn("w-3 h-3", favorites.includes(f.name) && "fill-yellow-400")} />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {groupedFonts.map(({ family, variants }) => {
                                            if (variants.length === 1) {
                                                const f = variants[0];
                                                return (
                                                    <div key={f.name} className="relative group/fontbtn">
                                                        <button
                                                            onClick={() => updateObject(selectedObject.id, { fontFamily: f.value, fontWeight: 'normal' })}
                                                            className={cn(
                                                                "w-full p-4 rounded-xl border transition-all flex flex-col items-center gap-1",
                                                                selectedObject.fontFamily === f.value ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted hover:bg-white/10"
                                                            )}
                                                        >
                                                            <span className="text-xl" style={{ fontFamily: f.value }}>Aa</span>
                                                            <span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name}</span>
                                                        </button>
                                                        <button onClick={() => toggleFavorite(f.name)} className={cn("absolute top-1 right-1 p-1 text-muted hover:text-yellow-400 transition-colors", favorites.includes(f.name) && "text-yellow-400")}>
                                                            <Star className={cn("w-3 h-3", favorites.includes(f.name) && "fill-yellow-400")} />
                                                        </button>
                                                        <button onClick={() => setDefaultFont(f.value)} className={cn("absolute bottom-1 right-1 p-1 opacity-0 group-hover/fontbtn:opacity-100 text-muted hover:text-green-400 transition-all", defaultFont === f.value && "opacity-100 text-green-400")}>
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={family}
                                                    onClick={() => setExpandedFamily(family)}
                                                    className="w-full p-4 rounded-xl border border-white/5 bg-white/5 text-muted hover:bg-white/10 transition-all flex flex-col items-center gap-1 group"
                                                >
                                                    <span className="text-xl" style={{ fontFamily: variants[0].value }}>Aa</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] font-bold uppercase truncate max-w-[80px] text-center">{family}</span>
                                                        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setIsFontModalOpen(true)} className="col-span-2 p-4 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-muted hover:text-primary hover:border-primary/50 transition-all">
                                            <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Нэмэлт фонт</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* BASIC SETTINGS */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хэмжээ</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.fontSize}px</span>
                                </div>
                                <input
                                    type="range" min="8" max="300"
                                    value={selectedObject.fontSize}
                                    onChange={(e) => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Өнгө</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 grid grid-cols-8 gap-1.5">
                                        {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                                            <button key={c} onClick={() => updateObject(selectedObject.id, { color: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.color === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <input type="color" value={selectedObject.color} onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {styleSubTab === 'stroke' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний зузаан</label>
                                <span className="text-xs font-bold text-primary">{selectedObject.strokeWidth || 0}</span>
                            </div>
                            <input
                                type="range" min="0" max="50"
                                value={selectedObject.strokeWidth || 0}
                                onChange={(e) => updateObject(selectedObject.id, { strokeWidth: Number(e.target.value) })}
                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний өнгө</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                    {['transparent', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(c => (
                                        <button key={c} onClick={() => updateObject(selectedObject.id, { strokeColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90 flex items-center justify-center", selectedObject.strokeColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>
                                            {c === 'transparent' && <X className="w-3 h-3 text-red-500" />}
                                        </button>
                                    ))}
                                </div>
                                <input type="color" value={selectedObject.strokeColor === 'transparent' ? '#000000' : selectedObject.strokeColor} onChange={(e) => updateObject(selectedObject.id, { strokeColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                            </div>
                        </div>
                    </div>
                )}

                {styleSubTab === 'shadow' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Сүүдэр Blur</label>
                                <span className="text-xs font-bold text-primary">{selectedObject.shadowBlur || 0}</span>
                            </div>
                            <input
                                type="range" min="0" max="50"
                                value={selectedObject.shadowBlur || 0}
                                onChange={(e) => updateObject(selectedObject.id, { shadowBlur: Number(e.target.value) })}
                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Offset X</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.shadowOffsetX || 0}</span>
                                </div>
                                <input
                                    type="range" min="-30" max="30"
                                    value={selectedObject.shadowOffsetX || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { shadowOffsetX: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Offset Y</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.shadowOffsetY || 0}</span>
                                </div>
                                <input
                                    type="range" min="-30" max="30"
                                    value={selectedObject.shadowOffsetY || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { shadowOffsetY: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа (Opacity)</label>
                                <span className="text-xs font-bold text-primary">{Math.round((selectedObject.shadowOpacity || 0.5) * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={selectedObject.shadowOpacity || 0.5}
                                onChange={(e) => updateObject(selectedObject.id, { shadowOpacity: Number(e.target.value) })}
                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Сүүдрийн өнгө</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                    {['#000000', '#333333', '#666666', '#FF0000', '#0000FF', '#7C3AED', '#DB2777', '#059669'].map(c => (
                                        <button key={c} onClick={() => updateObject(selectedObject.id, { shadowColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.shadowColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                                <input type="color" value={selectedObject.shadowColor || '#000000'} onChange={(e) => updateObject(selectedObject.id, { shadowColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                            </div>
                        </div>
                    </div>
                )}

                {styleSubTab === 'canvas' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Булан</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.bgBorderRadius || 0}</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={selectedObject.bgBorderRadius || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { bgBorderRadius: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа (Opacity)</label>
                                    <span className="text-xs font-bold text-primary">{Math.round((selectedObject.bgOpacity || 1) * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={selectedObject.bgOpacity || 1}
                                    onChange={(e) => updateObject(selectedObject.id, { bgOpacity: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Padding X</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.bgPaddingX || 0}</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={selectedObject.bgPaddingX || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { bgPaddingX: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Padding Y</label>
                                    <span className="text-xs font-bold text-primary">{selectedObject.bgPaddingY || 0}</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={selectedObject.bgPaddingY || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { bgPaddingY: Number(e.target.value) })}
                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Фон өнгө</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                    {['transparent', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(c => (
                                        <button key={c} onClick={() => updateObject(selectedObject.id, { backgroundColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90 flex items-center justify-center", selectedObject.backgroundColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>
                                            {c === 'transparent' && <X className="w-3 h-3 text-red-500" />}
                                        </button>
                                    ))}
                                </div>
                                <input type="color" value={selectedObject.backgroundColor === 'transparent' ? '#000000' : selectedObject.backgroundColor} onChange={(e) => updateObject(selectedObject.id, { backgroundColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                            </div>
                        </div>
                    </div>
                )}

                {styleSubTab === 'spacing' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Мөр хоорондын зай</label>
                                <span className="text-xs font-bold text-primary">{selectedObject.lineHeight}</span>
                            </div>
                            <input
                                type="range" min="0.5" max="3" step="0.1"
                                value={selectedObject.lineHeight}
                                onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })}
                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Үсэг хоорондын зай</label>
                                <span className="text-xs font-bold text-primary">{selectedObject.letterSpacing}px</span>
                            </div>
                            <input
                                type="range" min="-10" max="50"
                                value={selectedObject.letterSpacing}
                                onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })}
                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                <button
                    onClick={() => deleteObject(selectedObject!.id)}
                    className="w-full py-4 mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-tighter text-[10px] transition-all flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" /> Объектыг устгах
                </button>
            </div>
        </div>
    );
};
