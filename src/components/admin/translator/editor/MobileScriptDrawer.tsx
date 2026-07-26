import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Trash2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { TextObject, ImageItem, ActiveTabType } from './types';

interface MobileScriptDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    images: ImageItem[];
    objects: TextObject[];
    sortedObjects: TextObject[];
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    setActiveTab: (tab: ActiveTabType) => void;
    updateObject: (id: string, updates: Partial<TextObject>) => void;
    deleteObject: (id: string) => void;
}

export const MobileScriptDrawer = ({
    isOpen,
    onClose,
    images,
    objects,
    sortedObjects,
    selectedId,
    setSelectedId,
    setActiveTab,
    updateObject,
    deleteObject
}: MobileScriptDrawerProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ bottom: 0.1, top: 0.1 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) {
                                onClose();
                            }
                        }}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="md:hidden fixed bottom-0 left-0 right-0 h-[85vh] bg-[#0a0a0a] rounded-t-[40px] overflow-hidden z-[70] border-t border-white/10 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-2 pb-1 bg-gradient-to-b from-white/5 to-transparent cursor-pointer" onClick={onClose}>
                            <div className="w-16 h-1 bg-white/20 rounded-full mt-2" />
                        </div>

                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h3 className="text-lg font-black uppercase tracking-tight">Translations</h3>
                            <button onClick={onClose} className="p-2 bg-white/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {images.map((img, idx) => (
                                <div key={img.id} className="space-y-3">
                                    <div className="text-[10px] font-black uppercase text-muted tracking-widest pl-2">Page {idx + 1}</div>
                                    {objects.filter(o => o.imageId === img.id).length === 0 ? (
                                        <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center text-muted text-xs">
                                            No bubbles yet. tap Magic Wand to start.
                                        </div>
                                    ) : (
                                        objects.filter(o => o.imageId === img.id).map((obj) => {
                                            const globalIndex = sortedObjects.findIndex(so => so.id === obj.id) + 1;
                                            return (
                                                <div
                                                    key={obj.id}
                                                    id={`mobile-item-${obj.id}`}
                                                    onClick={() => setSelectedId(obj.id)}
                                                    className={cn(
                                                        "rounded-2xl p-4 border space-y-2 transition-all",
                                                        selectedId === obj.id
                                                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] ring-1 ring-primary/50"
                                                            : "bg-white/5 border-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-muted uppercase bg-white/10 px-2 py-1 rounded-full">
                                                                #{globalIndex}
                                                            </span>
                                                            {obj.isScanning && <span className="text-[10px] text-primary animate-pulse">...</span>}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedId(obj.id);
                                                                    setActiveTab('style');
                                                                    onClose();
                                                                }}
                                                                className="p-1.5 bg-primary/10 text-primary rounded-lg active:scale-95 transition-all"
                                                            >
                                                                <Sliders className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Энэ бөмбөлгийг устгах уу?')) deleteObject(obj.id);
                                                                }}
                                                                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg active:scale-95 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {obj.originalText && (
                                                        <div className="text-xs text-muted mb-2 opacity-70 border-l-2 border-primary/50 pl-2">
                                                            {obj.originalText}
                                                        </div>
                                                    )}
                                                    <textarea
                                                        id={`mobile-input-${obj.id}`}
                                                        value={obj.text}
                                                        onChange={(e) => updateObject(obj.id, { text: e.target.value })}
                                                        onFocus={() => setSelectedId(obj.id)}
                                                        className="w-full bg-black/40 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none text-white placeholder:text-white/20"
                                                        rows={3}
                                                        placeholder="Translation..."
                                                    />
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            ))}
                            <div className="h-24" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
