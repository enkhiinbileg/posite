"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
}

export function TagInput({ value = [], onChange, placeholder, suggestions = [] }: TagInputProps) {
    const [input, setInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
        } else if (e.key === "Backspace" && !input && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const addTag = (text: string) => {
        const trimmed = text.trim().toUpperCase();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
            setInput("");
            setShowSuggestions(false);
        }
    };

    const removeTag = (index: number) => {
        const newTags = [...value];
        newTags.splice(index, 1);
        onChange(newTags);
    };

    const uniqueSuggestions = Array.from(new Set(suggestions));

    const filteredSuggestions = uniqueSuggestions.filter(s =>
        !value.includes(s.toUpperCase()) &&
        s.toUpperCase().includes(input.toUpperCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="w-full bg-background border border-white/10 rounded-xl p-2 flex flex-wrap gap-2 focus-within:border-primary/50 transition-all min-h-[50px]">
                {value.map((tag, index) => (
                    <span
                        key={index}
                        className="bg-primary/20 text-primary border border-primary/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ""}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[120px] h-8"
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors font-medium border-b border-white/5 last:border-0"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
