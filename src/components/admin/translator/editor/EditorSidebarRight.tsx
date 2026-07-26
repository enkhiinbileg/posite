import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Type, Trash2, Plus, Sliders, ChevronDown,
    AlignLeft, AlignCenter, AlignRight, Bold, Minus,
    Copy, Wand2, FileImage, CircleDashed, Loader2,
    Move, Star, Check, ScanLine, Eye, EyeOff, Lock, Unlock,
    Eraser, Layers, Maximize2, Sparkles, MousePointer2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STYLE_PRESETS } from './constants';

interface EditorSidebarRightProps {
    activeTab: 'translate' | 'style' | 'layers';
    setActiveTab: (tab: 'translate' | 'style' | 'layers') => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    objects: any[];
    drawings: any[];
    images: any[];
    activeChapterId: string;
    updateObject: (id: string, updates: any) => void;
    deleteObject: (id: string) => void;
    styleSubTab: 'basic' | 'stroke' | 'glow' | 'shadow' | 'fx' | 'canvas' | 'spacing' | 'opacity';
    setStyleSubTab: (tab: 'basic' | 'stroke' | 'glow' | 'shadow' | 'fx' | 'canvas' | 'spacing' | 'opacity') => void;
    isManagingFonts: boolean;
    setIsManagingFonts: (v: boolean) => void;
    favorites: string[];
    toggleFavorite: (font: string) => void;
    expandedFamily: string | null;
    setExpandedFamily: (family: string | null) => void;
    groupedFonts: any[];
    defaultFont: string;
    setDefaultFont: (font: string) => void;
    restoreHiddenFonts: () => void;
    toggleFontVisibility: (font: string) => void;
    setIsFontModalOpen: (v: boolean) => void;
    handleAutoFit: () => void;
    saveHistory: () => void;
    layerSettings: any;
    setLayerSettings: (settings: any) => void;
    setDrawingsMap: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    importUrl: string;
    setImportUrl: (url: string) => void;
    handleUrlImport: () => void;
    isImporting: boolean;
    scanPageForBubbles: (imageId: string) => void;
    handleCTPRImport: (e: React.ChangeEvent<HTMLInputElement>, imageId: string) => void;
    addText: (imageId: string) => void;
    imageSnippets: Record<string, string>;
    sortedObjects: any[];
    ctprInputRef: React.RefObject<HTMLInputElement>;
    isFocusMode: boolean;
}

export const EditorSidebarRight = React.memo(({
    activeTab,
    setActiveTab,
    selectedId,
    setSelectedId,
    objects,
    drawings,
    images,
    activeChapterId,
    updateObject,
    deleteObject,
    styleSubTab,
    setStyleSubTab,
    isManagingFonts,
    setIsManagingFonts,
    favorites,
    toggleFavorite,
    expandedFamily,
    setExpandedFamily,
    groupedFonts,
    defaultFont,
    setDefaultFont,
    restoreHiddenFonts,
    toggleFontVisibility,
    setIsFontModalOpen,
    handleAutoFit,
    saveHistory,
    layerSettings,
    setLayerSettings,
    setDrawingsMap,
    importUrl,
    setImportUrl,
    handleUrlImport,
    isImporting,
    scanPageForBubbles,
    handleCTPRImport,
    addText,
    imageSnippets,
    sortedObjects,
    ctprInputRef,
    isFocusMode
}: EditorSidebarRightProps) => {
    const selectedObject = (objects.find(o => o.id === selectedId) || drawings.find(d => d.id === selectedId)) as any;

    return (
        <div className={cn(
            "hidden md:flex w-96 bg-surface border-l border-white/5 flex-col shadow-2xl z-20 overflow-hidden transition-all duration-300",
            isFocusMode && "w-0 opacity-0 border-none"
        )}>
            {/* Tab Navigation */}
            <div className="flex border-b border-white/5 bg-black/20 p-2 gap-1 shrink-0">
                {[
                    { id: 'translate', icon: Type, label: 'Орчуулга' },
                    { id: 'style', icon: Sliders, label: 'Загвар' },
                    { id: 'layers', icon: Layers, label: 'Давхарга' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
                            activeTab === tab.id
                                ? "bg-white/10 text-white shadow-inner"
                                : "text-muted hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'translate' && (
                        <div key="translate" className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black uppercase tracking-tighter">Translate</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const allText = objects.map(o => o.text).join('\n\n');
                                            navigator.clipboard.writeText(allText);
                                            toast.success("Бүх орчуулга хуулагдлаа!");
                                        }}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted hover:text-white transition-all"
                                        title="Бүгдийг хуулах"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={importUrl}
                                        onChange={(e) => setImportUrl(e.target.value)}
                                        placeholder="Сайтын линкээс зураг нэмэх..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-primary transition-all"
                                    />
                                    <button
                                        onClick={handleUrlImport}
                                        disabled={isImporting || !importUrl}
                                        className="px-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 transition-all"
                                    >
                                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {images.map((img, idx) => (
                                    <div key={img.id} className="space-y-4">
                                        <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
                                            <div className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black text-muted uppercase tracking-widest">Page {idx + 1}</div>
                                            <button
                                                onClick={() => scanPageForBubbles(img.id)}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all text-[9px] font-black uppercase tracking-wider"
                                                title="Auto scan page for bubbles"
                                            >
                                                <Wand2 className="w-3 h-3" /> Scan Page
                                            </button>
                                            <button
                                                onClick={() => ctprInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/5 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider"
                                                title="Import .CTPR project for this page"
                                            >
                                                <FileImage className="w-3 h-3" /> Import .CTPR
                                            </button>
                                            <input
                                                type="file"
                                                ref={ctprInputRef}
                                                accept=".ctpr"
                                                className="hidden"
                                                onChange={(e) => handleCTPRImport(e, img.id)}
                                            />
                                        </div>

                                        <div className="space-y-4 px-1">
                                            {objects.filter(o => o.imageId === img.id).length === 0 && (
                                                <button
                                                    onClick={() => addText(img.id)}
                                                    className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:border-primary/50 hover:text-primary transition-all"
                                                >
                                                    <Plus className="w-3 h-3 inline-block mr-2" /> Текст нэмэх
                                                </button>
                                            )}
                                            {objects.filter(o => o.imageId === img.id).map((obj, oIdx) => (
                                                <div
                                                    key={obj.id}
                                                    onClick={() => setSelectedId(obj.id)}
                                                    className={cn(
                                                        "group p-4 rounded-3xl border transition-all cursor-pointer",
                                                        selectedId === obj.id
                                                            ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                                                            : "bg-white/2 border-white/5 hover:border-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 bg-primary/20 rounded-md flex items-center justify-center text-[10px] font-black text-primary">
                                                                {sortedObjects.findIndex(o => o.id === obj.id) + 1}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">Bubble</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteObject(obj.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {imageSnippets[obj.id] && (
                                                        <div className="mb-3 rounded-xl overflow-hidden border border-white/10 bg-black/50 relative group/snippet">
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover/snippet:opacity-100 transition-opacity">
                                                                <span className="text-[8px] bg-black/80 px-1.5 py-0.5 rounded text-muted">Эх хувь</span>
                                                            </div>
                                                            <img
                                                                src={imageSnippets[obj.id]}
                                                                alt="Original text"
                                                                className="w-full h-auto object-contain max-h-32"
                                                            />
                                                        </div>
                                                    )}

                                                    {obj.isScanning && (
                                                        <div className="flex items-center gap-2 text-[8px] font-black text-primary animate-pulse mt-2 uppercase">
                                                            <CircleDashed className="w-2.5 h-2.5 animate-spin" /> Unshij baina...
                                                        </div>
                                                    )}

                                                    {obj.originalText !== undefined && (
                                                        <div className="mb-2 p-3 bg-black/20 rounded-xl border border-white/5 text-xs text-muted leading-relaxed select-text cursor-text relative group/ocr pr-8">
                                                            <div className="absolute top-1 right-2 flex gap-2 opacity-0 group-hover/ocr:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (obj.originalText) {
                                                                            navigator.clipboard.writeText(obj.originalText);
                                                                            toast.success("Хуулагдлаа!");
                                                                        }
                                                                    }}
                                                                    className="p-1 hover:bg-white/10 rounded text-white"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            {obj.originalText}
                                                        </div>
                                                    )}

                                                    <textarea
                                                        id={`textarea-${obj.id}`}
                                                        value={obj.text}
                                                        onChange={(e) => updateObject(obj.id, { text: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                                                                e.preventDefault();
                                                                const idx = sortedObjects.findIndex(o => o.id === obj.id);
                                                                if (idx !== -1 && idx < sortedObjects.length - 1) {
                                                                    const nextId = sortedObjects[idx + 1].id;
                                                                    setSelectedId(nextId);
                                                                    setTimeout(() => {
                                                                        const el = document.getElementById(`textarea-${nextId}`);
                                                                        el?.focus();
                                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }, 50);
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "w-full bg-black/40 border rounded-2xl p-4 text-sm outline-none transition-all min-h-[6rem] overflow-hidden leading-relaxed placeholder:text-white/10",
                                                            selectedId === obj.id ? "border-primary ring-1 ring-primary/20" : "border-white/5"
                                                        )}
                                                        placeholder="Орчуулга бичих..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'style' && (
                        selectedObject && selectedObject.text !== undefined ? (
                            <div key="style" className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Текст</label>
                                    <textarea
                                        value={selectedObject.text}
                                        onChange={(e) => updateObject(selectedObject.id, { text: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:border-primary outline-none transition-all h-32 resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2 border-b border-white/5 mb-4 px-1">
                                    {[
                                        { id: 'basic', label: 'Загвар' },
                                        { id: 'fx', label: 'FX' },
                                        { id: 'stroke', label: 'Хүрээ' },
                                        { id: 'glow', label: 'Гэрэл' },
                                        { id: 'shadow', label: 'Сүүдэр' },
                                        { id: 'canvas', label: 'Фон' },
                                        { id: 'spacing', label: 'Зай' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setStyleSubTab(tab.id as any)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                                                styleSubTab === tab.id ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {styleSubTab === 'basic' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Фонт</label>
                                                <button onClick={() => setIsManagingFonts(!isManagingFonts)} className="text-[10px] uppercase font-bold text-muted hover:text-white">
                                                    {isManagingFonts ? "Done" : "Manage"}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {groupedFonts.map(({ family, variants }) => (
                                                    <div key={family} className="relative col-span-2">
                                                        <button
                                                            onClick={() => setExpandedFamily(expandedFamily === family ? null : family)}
                                                            className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all"
                                                        >
                                                            <span className="text-[10px] font-black uppercase truncate">{family}</span>
                                                            <ChevronDown className={cn("w-4 h-4 transition-transform", expandedFamily === family && "rotate-180")} />
                                                        </button>
                                                        <AnimatePresence>
                                                            {expandedFamily === family && (
                                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-black/20 rounded-b-xl border-x border-b border-white/5">
                                                                    <div className="p-2 grid grid-cols-2 gap-2">
                                                                        {variants.map((f: any) => (
                                                                            <button
                                                                                key={f.name}
                                                                                onClick={() => updateObject(selectedObject.id, { fontFamily: f.value, fontWeight: f.weight || 'normal', fontStyle: f.style || 'normal' })}
                                                                                className={cn(
                                                                                    "p-2 rounded-lg text-[10px] font-bold text-left transition-all border",
                                                                                    selectedObject.fontFamily === f.value ? "bg-primary/20 border-primary text-primary" : "border-transparent text-muted"
                                                                                )}
                                                                                style={{ fontFamily: f.value }}
                                                                            >
                                                                                {f.name.replace(family, '').trim() || 'Regular'}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                                <button onClick={() => setIsFontModalOpen(true)} className="col-span-2 p-3 rounded-xl border border-dashed border-white/10 text-[10px] font-black uppercase text-muted hover:text-primary transition-all">
                                                    + More Fonts
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Size</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.fontSize}</span>
                                                </div>
                                                <input
                                                    type="range" min="10" max="240"
                                                    value={selectedObject.fontSize}
                                                    onChange={(e) => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })}
                                                    className="w-full h-1 accent-primary bg-white/5 rounded-full"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Opacity</label>
                                                    <span className="text-xs font-bold text-primary">{Math.round(selectedObject.opacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.01"
                                                    value={selectedObject.opacity}
                                                    onChange={(e) => updateObject(selectedObject.id, { opacity: Number(e.target.value) })}
                                                    className="w-full h-1 accent-primary bg-white/5 rounded-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Align</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['left', 'center', 'right'].map((align: any) => (
                                                    <button
                                                        key={align}
                                                        onClick={() => updateObject(selectedObject.id, { textAlign: align })}
                                                        className={cn("p-3 rounded-xl transition-all", selectedObject.textAlign === align ? "bg-primary text-white" : "bg-white/5 text-muted")}
                                                    >
                                                        {align === 'left' && <AlignLeft className="w-4 h-4 mx-auto" />}
                                                        {align === 'center' && <AlignCenter className="w-4 h-4 mx-auto" />}
                                                        {align === 'right' && <AlignRight className="w-4 h-4 mx-auto" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Color</label>
                                            <input
                                                type="color"
                                                value={selectedObject.color}
                                                onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })}
                                                className="w-full h-10 bg-transparent border-none cursor-pointer rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}

                                {styleSubTab === 'fx' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {STYLE_PRESETS.map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => {
                                                    saveHistory();
                                                    updateObject(selectedObject.id, preset.style);
                                                    toast.success(`${preset.name} applied!`);
                                                }}
                                                className="group flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-primary/50 transition-all"
                                            >
                                                <div className="text-3xl group-hover:scale-110 transition-transform">{preset.previewIcon}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary">{preset.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => deleteObject(selectedObject.id)}
                                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Object
                                </button>
                            </div>
                        ) : (
                            <div key="select-prompt" className="flex flex-col items-center justify-center p-8 text-center h-[50vh] opacity-50">
                                <MousePointer2 className="w-12 h-12 mb-4 text-muted" />
                                <p className="text-sm font-bold text-muted">Select an object to edit style</p>
                            </div>
                        )
                    )}

                    {activeTab === 'layers' && (
                        <div key="layers" className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Layers</h2>

                            {/* Text Layer Control */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg"> <Type className="w-5 h-5" /> </div>
                                        <div>
                                            <div className="text-sm font-bold">Text Layer</div>
                                            <div className="text-[10px] text-muted uppercase font-bold tracking-widest">{objects.length} items</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setLayerSettings((prev: any) => ({ ...prev, text: { ...prev.text, visible: !prev.text.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.visible ? "text-white" : "text-muted")}>
                                            {layerSettings.text.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setLayerSettings((prev: any) => ({ ...prev, text: { ...prev.text, locked: !prev.text.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.locked ? "text-primary bg-primary/10" : "text-muted")}>
                                            {layerSettings.text.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {layerSettings.text.visible && (
                                    <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide">
                                        {objects.map((obj, i) => (
                                            <div key={obj.id} onClick={() => setSelectedId(obj.id)} className={cn("p-2 rounded-lg text-xs font-bold truncate cursor-pointer", selectedId === obj.id ? "bg-primary/20 text-primary" : "text-muted hover:bg-white/5")}>
                                                #{i + 1}: {obj.text || 'Empty'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Drawings Layer */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-green-500/20 text-green-500 rounded-lg"> <Eraser className="w-5 h-5" /> </div>
                                        <div>
                                            <div className="text-sm font-bold">Clean / SFX</div>
                                            <div className="text-[10px] text-muted uppercase font-bold tracking-widest">{drawings.length} items</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setLayerSettings((prev: any) => ({ ...prev, drawings: { ...prev.drawings, visible: !prev.drawings.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.visible ? "text-white" : "text-muted")}>
                                            {layerSettings.drawings.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setLayerSettings((prev: any) => ({ ...prev, drawings: { ...prev.drawings, locked: !prev.drawings.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.locked ? "text-primary bg-primary/10" : "text-muted")}>
                                            {layerSettings.drawings.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {layerSettings.drawings.visible && (
                                    <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide">
                                        {drawings.map((draw, i) => (
                                            <div key={draw.id} onClick={() => setSelectedId(draw.id)} className={cn("p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer", selectedId === draw.id ? "bg-primary/20 text-primary" : "text-muted hover:bg-white/5")}>
                                                <span className="truncate">#{i + 1}: {draw.type || 'Eraser'}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setDrawingsMap(prev => ({ ...prev, [activeChapterId]: (prev[activeChapterId] || []).filter(d => d.id !== draw.id) })); }} className="p-1 hover:text-red-500">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

EditorSidebarRight.displayName = 'EditorSidebarRight';
