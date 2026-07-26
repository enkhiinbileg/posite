import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterItem {
    id: string;
    name: string;
    images: any[];
}

interface EditorSidebarChaptersProps {
    chapters: ChapterItem[];
    activeChapterId: string;
    setActiveChapterId: (v: string) => void;
    onAddChapter?: () => void;
    onDeleteChapter?: (chapterId: string) => void;
    isFocusMode: boolean;
}

export const EditorSidebarChapters = React.memo(({
    chapters,
    activeChapterId,
    setActiveChapterId,
    isFocusMode,
    onDeleteChapter,
    onAddChapter
}: EditorSidebarChaptersProps) => {
    return (
        <div className={cn(
            "hidden md:flex w-64 bg-surface/50 border-r border-white/5 flex-col py-8 shadow-xl z-20 transition-all duration-300",
            isFocusMode && "w-0 opacity-0 border-none p-0 overflow-hidden"
        )}>
            <div className="px-6 mb-6">
                <h3 className="text-[10px] font-black uppercase text-muted tracking-[0.2em] mb-4">Chapter Queue</h3>
                <div className="space-y-2">
                    {chapters.map((ch, idx) => (
                        <div key={ch.id} className="relative group/ch">
                            <button
                                onClick={() => setActiveChapterId(ch.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group text-left",
                                    activeChapterId === ch.id
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "hover:bg-white/5 text-muted hover:text-white"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                                    activeChapterId === ch.id ? "bg-white/20" : "bg-white/5"
                                )}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black truncate">{ch.name}</div>
                                    <div className="text-[8px] opacity-60 font-bold uppercase tracking-widest">{ch.images.length} images</div>
                                </div>
                                {activeChapterId === ch.id && (
                                    <motion.div layoutId="activeDot" className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                            </button>

                            {chapters.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChapter?.(ch.id);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover/ch:opacity-100 transition-all hover:bg-red-500 hover:text-white scale-75 group-hover/ch:scale-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto px-6">
                <button
                    onClick={onAddChapter}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-3 h-3" /> New Chapter
                </button>
            </div>
        </div>
    );
});

EditorSidebarChapters.displayName = 'EditorSidebarChapters';
