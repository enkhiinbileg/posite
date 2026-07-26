"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, LayoutGrid, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Webtoon {
    id: number;
    title: string;
    image?: string;
    is_nsfw?: boolean;
}

interface WebtoonSearchSelectorProps {
    webtoons: Webtoon[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    label?: string;
    placeholder?: string;
}

export default function WebtoonSearchSelector({
    webtoons,
    selectedId,
    onSelect,
    label = "Вебтүүн Сонгох",
    placeholder = "Вэбтүүн хайх..."
}: WebtoonSearchSelectorProps) {
    useEffect(() => {
        console.log("WebtoonSearchSelector: received webtoons:", webtoons?.length, webtoons?.[0]);
    }, [webtoons]);

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [activeCategory, setActiveCategory] = useState<'normal' | 'nsfw'>('normal');

    const selectedWebtoon = useMemo(() => 
        webtoons.find(w => w.id === selectedId), 
    [webtoons, selectedId]);

    const filteredWebtoons = useMemo(() => {
        let list = webtoons.filter(w => activeCategory === 'nsfw' ? w.is_nsfw : !w.is_nsfw);
        if (!search) return list;
        const s = search.toLowerCase();
        return list.filter(w => 
            w.title.toLowerCase().includes(s) || 
            w.id.toString().includes(s)
        );
    }, [webtoons, search, activeCategory]);

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div className="space-y-3 relative" ref={containerRef}>
            <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
                {selectedId && (
                    <span className="text-[9px] font-bold text-primary">ID: #{selectedId}</span>
                )}
            </div>

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all flex items-center justify-between group",
                    isOpen ? "border-primary ring-4 ring-primary/10" : "hover:border-white/20 hover:bg-black/60"
                )}
            >
                <div className="flex items-center gap-3 min-w-0 text-left">
                    {selectedWebtoon ? (
                        <>
                        <div className="w-8 h-10 relative rounded-md overflow-hidden bg-white/5 shrink-0 border border-white/10">
                            {(selectedWebtoon.image || (selectedWebtoon as any).image_url) ? (
                                <img 
                                    src={selectedWebtoon.image || (selectedWebtoon as any).image_url} 
                                    alt={selectedWebtoon.title} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black/40">
                                    <LayoutGrid className="w-3 h-3 text-muted/30" />
                                </div>
                            )}
                        </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-white uppercase tracking-tight text-xs leading-tight mb-1">{selectedWebtoon.title}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">ID: #{selectedWebtoon.id}</span>
                                    {selectedWebtoon.is_nsfw && (
                                        <span className="bg-red-500/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-red-500/30">18+</span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <span className="text-muted/50 uppercase tracking-widest text-[10px]">-- Вэбтүүн сонгох --</span>
                    )}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[150] top-full left-0 right-0 mt-2 bg-[#0f0f0f]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/10"
                    >
                        {/* Category Tabs */}
                        <div className="grid grid-cols-2 p-1.5 bg-white/[0.02] border-b border-white/5">
                            <button
                                type="button"
                                onClick={() => setActiveCategory('normal')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all relative overflow-hidden group",
                                    activeCategory === 'normal' 
                                        ? "text-primary" 
                                        : "text-muted hover:text-white"
                                )}
                            >
                                {activeCategory === 'normal' && (
                                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl" />
                                )}
                                <Sparkles className={cn("w-3.5 h-3.5 relative z-10", activeCategory === 'normal' ? "text-primary" : "text-muted")} />
                                <span className="relative z-10">Normal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveCategory('nsfw')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all relative overflow-hidden group",
                                    activeCategory === 'nsfw' 
                                        ? "text-red-500" 
                                        : "text-muted hover:text-red-400"
                                )}
                            >
                                {activeCategory === 'nsfw' && (
                                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-red-500/10 border border-red-500/20 rounded-2xl" />
                                )}
                                <div className={cn("w-1.5 h-1.5 rounded-full relative z-10", activeCategory === 'nsfw' ? "bg-red-500 animate-pulse" : "bg-muted")} />
                                <span className="relative z-10">+18 (NSFW)</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-white/5">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={activeCategory === 'nsfw' ? "+18 вэбтүүн хайх..." : "Вэбтүүн хайх..."}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-white placeholder:text-muted/30"
                                />
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                            {filteredWebtoons.length === 0 ? (
                                <div className="py-16 text-center space-y-3">
                                    <AlertCircle className="w-8 h-8 text-muted/10 mx-auto" />
                                    <p className="text-[10px] text-muted/40 font-black uppercase tracking-widest">
                                        {search ? "Илэрц олдсонгүй" : `${activeCategory === 'nsfw' ? '+18' : 'Ерөнхий'} төрөлд вэбтүүн алга`}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-1">
                                    {filteredWebtoons.map(w => (
                                        <WebtoonItem 
                                            key={w.id} 
                                            webtoon={w} 
                                            isSelected={selectedId === w.id} 
                                            onClick={() => {
                                                onSelect(w.id);
                                                setIsOpen(false);
                                                setSearch("");
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between px-6">
                            <p className="text-[8px] font-black text-muted/40 uppercase tracking-widest">
                                {filteredWebtoons.length} results
                            </p>
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-primary/40" />
                                <p className="text-[8px] font-black text-muted/40 uppercase tracking-widest">Selection Portal</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function WebtoonItem({ webtoon, isSelected, onClick }: { webtoon: Webtoon, isSelected: boolean, onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group relative overflow-hidden",
                isSelected 
                    ? "bg-primary/20 border border-primary/20" 
                    : "hover:bg-white/5 border border-transparent"
            )}
        >
            <div className="w-10 h-14 relative rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/5 shadow-lg">
                {(webtoon.image || (webtoon as any).image_url) ? (
                    <img 
                        src={webtoon.image || (webtoon as any).image_url} 
                        alt={webtoon.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                            console.error("Image load error for:", webtoon.title, webtoon.image || (webtoon as any).image_url);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {/* Debug: {console.log("No image for:", webtoon.title, Object.keys(webtoon))} */}
                        <LayoutGrid className="w-4 h-4 text-muted/20" />
                    </div>
                )}
            </div>
            
            <div className="flex-1 min-w-0 py-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <h4 className={cn(
                        "font-black text-sm uppercase tracking-tight transition-colors leading-[1.2]",
                        isSelected ? "text-primary" : "text-white group-hover:text-primary"
                    )}>
                        {webtoon.title}
                    </h4>
                    {webtoon.is_nsfw && (
                        <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-red-500/20 shrink-0">18+</span>
                    )}
                </div>
                <p className="text-[10px] text-muted font-bold tracking-widest uppercase opacity-60">ID: #{webtoon.id}</p>
            </div>

            {isSelected && (
                <div className="bg-primary rounded-full p-1.5 shadow-lg shadow-primary/20">
                    <Check className="w-3 h-3 text-white" />
                </div>
            )}

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] transition-colors pointer-events-none" />
        </button>
    );
}
