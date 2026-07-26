"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GenreFilterProps {
    activeGenre: string;
    onGenreChange: (genre: string) => void;
}

const genres = [
    "Бүх", "Action", "Adventure", "Fantasy", "Mystery", "Drama", "Romance", "Comedy", "Supernatural", "Historical"
];

export function GenreFilter({ activeGenre, onGenreChange }: GenreFilterProps) {
    return (
        <div className="relative group/filter">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-3 px-1">
                {genres.map((genre) => (
                    <motion.button
                        key={genre}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onGenreChange(genre)}
                        className={cn(
                            "px-5 py-2 rounded-2xl text-[10px] font-black whitespace-nowrap transition-all duration-500 border uppercase tracking-widest",
                            activeGenre === genre
                                ? "bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.15)] scale-105"
                                : "bg-white/5 text-white/50 hover:text-white border-white/5 hover:border-white/20 backdrop-blur-md"
                        )}
                    >
                        {genre === "Бүх" ? "Бүх төрөл" : genre}
                    </motion.button>
                ))}
            </div>
            {/* Elegant Fade Indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 opacity-0 group-hover/filter:opacity-100 transition-opacity duration-500" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
    );
}
