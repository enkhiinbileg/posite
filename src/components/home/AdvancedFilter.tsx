"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";

interface FilterOption {
    id: string;
    label: string;
}

interface AdvancedFilterProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeGenre: string;
    activeSort: string;
    activeStatus: string;
    onGenreChange: (genre: string) => void;
    onSortChange: (sort: string) => void;
    onStatusChange: (status: string) => void;
}

const FilterDropdown = ({ title, value, options, onChange, id, activeDropdown, setActiveDropdown }: {
    title: string;
    value: string;
    options: FilterOption[];
    onChange: (val: string) => void;
    id: string;
    activeDropdown: string | null;
    setActiveDropdown: (id: string | null) => void;
}) => {
    const isOpen = activeDropdown === id;
    const selectedLabel = options.find(o => o.id === value)?.label || value;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setActiveDropdown(null);
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, setActiveDropdown]);

    return (
        <div className="relative">
            <motion.button
                id={`filter-btn-${id}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveDropdown(isOpen ? null : id)}
                className={cn(
                    "relative flex flex-row items-center justify-between w-[95px] lg:w-[130px] h-[30px] px-2 border rounded-[4px] transition-all bg-[#0a0a0a]",
                    isOpen ? "border-white/50" : "border-white/20 hover:border-white/40"
                )}
            >
                <span className="absolute -top-[6px] left-1.5 px-1 bg-[#0a0a0a] text-[#eab308] text-[8px] font-medium leading-none tracking-wide z-10">
                    {title}
                </span>
                <span className={cn(
                    "text-[10px] truncate tracking-wide text-left",
                    isOpen ? "text-white font-medium" : "text-white/60"
                )}>
                    {selectedLabel}
                </span>
                <ChevronDown
                    className={cn(
                        "w-3 h-3 transition-transform duration-300 ml-1 flex-shrink-0",
                        isOpen ? "rotate-180 text-white" : "rotate-0 text-white/40"
                    )}
                />
            </motion.button>

            {mounted && (
                <>
                    {/* Portal for Mobile Bottom Sheet */}
                    {createPortal(
                        <AnimatePresence mode="wait">
                            {isOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md lg:hidden"
                                        onClick={() => setActiveDropdown(null)}
                                    />
                                    <motion.div
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        exit={{ y: "100%" }}
                                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                        className="fixed bottom-0 left-0 right-0 z-[1001] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] max-h-[85vh] overflow-hidden lg:hidden shadow-[0_-20px_80px_rgba(0,0,0,0.9)]"
                                    >
                                        <div className="flex justify-center pt-4 pb-2">
                                            <div className="w-12 h-1.5 rounded-full bg-white/20" />
                                        </div>
                                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                            <h3 className="text-xl font-black uppercase tracking-tight text-white">{title}</h3>
                                            <button 
                                                onClick={() => setActiveDropdown(null)} 
                                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                            >
                                                <X className="w-6 h-6 text-white/70" />
                                            </button>
                                        </div>
                                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] no-scrollbar">
                                            <div className="grid grid-cols-2 gap-3 pb-10">
                                                {options.map((opt) => (
                                                    <motion.button
                                                        key={opt.id}
                                                        whileTap={{ scale: 0.96 }}
                                                        onClick={() => {
                                                            onChange(opt.id);
                                                            setActiveDropdown(null);
                                                        }}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-6 rounded-2xl text-xs font-black transition-all border-2",
                                                            value === opt.id
                                                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-[1.02]"
                                                                : "bg-surface/50 border-white/5 text-white/40 hover:bg-surface hover:border-white/20 hover:text-white/80"
                                                        )}
                                                    >
                                                        <span className="uppercase tracking-[0.15em]">{opt.label}</span>
                                                        {value === opt.id && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                                <Check className="w-4 h-4 mt-2 text-white" />
                                                            </motion.div>
                                                        )}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}

                    {/* Desktop Dropdown Tooltip */}
                    <AnimatePresence mode="wait">
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10, filter: "blur(10px)" }}
                                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 0.95, y: -10, filter: "blur(10px)" }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="hidden lg:block absolute top-full mt-6 left-1/2 -translate-x-1/2 z-[1002] min-w-[280px] bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.05)] p-2 before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:w-4 before:h-4 before:rotate-45 before:bg-[#0A0A0A]/80 before:border-l before:border-t before:border-white/10"
                            >
                                <div className="grid grid-cols-1 gap-1 relative z-10 bg-[#0a0a0a]/50 rounded-[20px] p-1 max-h-[320px] overflow-y-auto no-scrollbar scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {options.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                onChange(opt.id);
                                                setActiveDropdown(null);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-5 py-3.5 rounded-[16px] text-xs font-bold transition-all duration-300 relative overflow-hidden group flex-shrink-0",
                                                value === opt.id
                                                    ? "text-white"
                                                    : "text-white/50 hover:text-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute inset-0 transition-opacity duration-300",
                                                value === opt.id ? "bg-white/10 opacity-100" : "bg-white/5 opacity-0 group-hover:opacity-100"
                                            )} />
                                            <span className="relative z-10 tracking-widest uppercase">{opt.label}</span>
                                            {value === opt.id && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10">
                                                    <Check className="w-4 h-4 text-white" />
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export function AdvancedFilter({
    searchQuery,
    onSearchChange,
    activeGenre,
    activeSort,
    activeStatus,
    onGenreChange,
    onSortChange,
    onStatusChange
}: AdvancedFilterProps) {

    const sortOptions: FilterOption[] = [
        { id: "popular", label: "Эрэлттэй" },
        { id: "newest", label: "Шинэ" },
        { id: "a-z", label: "A-Z" },
    ];

    const statusOptions: FilterOption[] = [
        { id: "all", label: "Бүгд" },
        { id: "ongoing", label: "Гарч байгаа" },
        { id: "completed", label: "Дууссан" },
    ];

    const genreOptions: FilterOption[] = [
        { id: "Бүх", label: "Бүгд" },
        { id: "Romance", label: "Romance" }, { id: "Fantasy", label: "Fantasy" },
        { id: "Action", label: "Action" }, { id: "Drama", label: "Drama" },
        { id: "Comedy", label: "Comedy" }, { id: "Thriller", label: "Thriller" },
        { id: "Horror", label: "Horror" }, { id: "Historical", label: "Historical" },
        { id: "Sports", label: "Sports" }, { id: "School", label: "School" },
        { id: "Mystery", label: "Mystery" },
    ];

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    useEffect(() => {
        if (activeDropdown) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [activeDropdown]);

    return (
        <div className="w-full relative z-20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6 max-w-6xl mx-auto lg:px-4">
                {/* Search Bar - Ultimate Premium Series */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="hidden lg:block relative group w-full lg:flex-1 lg:max-w-[450px] xl:max-w-[550px] px-4 lg:px-0 z-20"
                >
                    {/* Multi-layered Animated Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-blue-500/20 rounded-[28px] blur-xl opacity-0 group-focus-within:opacity-100 scale-95 group-focus-within:scale-105 transition-all duration-1000 ease-out" />
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-[28px] blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative flex items-center h-[48px] lg:h-[50px] bg-[#0a0a0a]/60 backdrop-blur-3xl border border-white/10 rounded-[28px] overflow-hidden focus-within:border-white/30 focus-within:bg-[#0a0a0a]/80 transition-all duration-500 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group-focus-within:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                        <div className="pl-5 lg:pl-6 pr-3">
                            <motion.div 
                                animate={{ scale: searchQuery ? 1.05 : 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Search className="w-4 h-4 text-white/30 group-focus-within:text-white transition-colors duration-500" />
                            </motion.div>
                        </div>
                        <input
                            type="text"
                            placeholder="ХАЙХ УТГАА ОРУУЛНА УУ..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="flex-1 bg-transparent border-none py-0 h-full w-full pr-4 text-[11px] lg:text-[12px] font-semibold text-white placeholder:text-white/20 focus:ring-0 focus:outline-none transition-all tracking-widest uppercase"
                        />
                        <AnimatePresence>
                            {searchQuery && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onSearchChange("")}
                                    className="mr-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
                                >
                                    <X className="w-3.5 h-3.5 text-white" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Filters - Mobile 100% Clone */}
                <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex justify-between w-full lg:w-auto px-4 lg:px-0 z-10 pt-1 lg:pt-0"
                >
                    <div className="flex flex-row items-center gap-1.5 lg:gap-3">
                        <FilterDropdown
                            id="genre"
                            title="Төрөл"
                            value={activeGenre}
                            options={genreOptions}
                            onChange={onGenreChange}
                            activeDropdown={activeDropdown}
                            setActiveDropdown={setActiveDropdown}
                        />
                        <FilterDropdown
                            id="status"
                            title="Төлөв"
                            value={activeStatus}
                            options={statusOptions}
                            onChange={onStatusChange}
                            activeDropdown={activeDropdown}
                            setActiveDropdown={setActiveDropdown}
                        />
                    </div>
                    <FilterDropdown
                        id="sort"
                        title="Эрэмбэ"
                        value={activeSort}
                        options={sortOptions}
                        onChange={onSortChange}
                        activeDropdown={activeDropdown}
                        setActiveDropdown={setActiveDropdown}
                    />
                </motion.div>
            </div>
        </div>
    );
}
