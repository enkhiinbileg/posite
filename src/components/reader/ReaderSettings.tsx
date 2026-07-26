"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, Coffee, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    theme: "dark" | "light" | "sepia";
    setTheme: (theme: "dark" | "light" | "sepia") => void;
    brightness: number;
    setBrightness: (brightness: number) => void;
    readMode: "vertical" | "horizontal";
    setReadMode: (mode: "vertical" | "horizontal") => void;
}

export function ReaderSettings({
    isOpen,
    onClose,
    theme,
    setTheme,
    brightness,
    setBrightness,
    readMode,
    setReadMode
}: ReaderSettingsProps) {
    const themes = [
        { id: "dark", name: "Харанхуй", icon: Moon, bg: "bg-[#050505]", text: "text-white" },
        { id: "light", name: "Гэрэлтэй", icon: Sun, bg: "bg-white", text: "text-black" },
        { id: "sepia", name: "Сэпиа", icon: Coffee, bg: "bg-[#f4ecd8]", text: "text-[#5b4636]" },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Settings Content */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] bg-background border-l border-white/5 z-[101] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter">Тохиргоо</h2>
                                <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Reader Settings</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-10">
                            {/* Theme Selection */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Дэвсгэр өнгө</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {themes.map((t: any) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl transition-all border-2",
                                                theme === t.id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-white/5 bg-surface hover:border-white/10"
                                            )}
                                        >
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.bg, t.text)}>
                                                <t.icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn("font-bold", theme === t.id ? "text-primary" : "text-white")}>
                                                {t.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Read Mode Selection */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Унших Горми</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setReadMode("vertical")}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                                            readMode === "vertical" ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-surface text-white hover:border-white/10"
                                        )}
                                    >
                                        <span className="font-bold text-sm">Босоо</span>
                                    </button>
                                    <button
                                        onClick={() => setReadMode("horizontal")}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                                            readMode === "horizontal" ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-surface text-white hover:border-white/10"
                                        )}
                                    >
                                        <span className="font-bold text-sm">Хэвтээ</span>
                                    </button>
                                </div>
                            </section>

                            {/* Brightness Control */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                    <span>Гэрэлтүүлэг</span>
                                    <span className="text-primary">{brightness}%</span>
                                </div>
                                <div className="flex items-center gap-4 bg-surface p-2 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => setBrightness(Math.max(30, brightness - 10))}
                                        className="p-3 rounded-xl bg-background hover:bg-white/5 transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="range"
                                        min="30"
                                        max="100"
                                        value={brightness}
                                        onChange={(e) => setBrightness(Number(e.target.value))}
                                        className="flex-1 accent-primary h-1 bg-background rounded-full appearance-none cursor-pointer"
                                    />
                                    <button
                                        onClick={() => setBrightness(Math.min(100, brightness + 10))}
                                        className="p-3 rounded-xl bg-background hover:bg-white/5 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>

                                </div>
                            </section>
                        </div>

                        <div className="mt-auto p-6 border-t border-white/5">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                            >
                                Хадгалах
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
