import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutTemplate, Move, Maximize2, CircleDashed } from 'lucide-react';

interface ShortcutGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutGuideModal = ({ isOpen, onClose }: ShortcutGuideModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary"><LayoutTemplate className="w-5 h-5" /></div>
                            Keyboard Shortcuts
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-sm font-bold text-muted flex items-center gap-2"><Move className="w-4 h-4" /> Hand Tool (Pan)</span>
                                <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded text-white border border-white/10">Space + Drag</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-sm font-bold text-muted flex items-center gap-2"><Maximize2 className="w-4 h-4" /> Smart Zoom</span>
                                <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded text-white border border-white/10">Ctrl + Scroll</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-sm font-bold text-muted flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Focus Mode</span>
                                <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded text-white border border-white/10">F</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-sm font-bold text-muted flex items-center gap-2"><CircleDashed className="w-4 h-4" /> Show/Hide Guide</span>
                                <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded text-white border border-white/10">?</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Pro Tip: Use 'Split View' for better translation workflow</p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
