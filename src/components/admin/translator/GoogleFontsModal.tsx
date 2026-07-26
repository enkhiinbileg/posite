'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Loader2, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GoogleFontsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (fontFamily: string) => void;
    currentDefault: string;
    onSetDefault: (fontFamily: string) => void;
}

interface GoogleFont {
    family: string;
    category: string;
    variants: string[];
    subsets: string[];
    files: { [key: string]: string };
}

const POPULAR_FONTS = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
    'Slabo 27px', 'Raleway', 'PT Sans', 'Merriweather', 'Noto Sans', 'Nunito',
    'Concert One', 'Prompt', 'Rubik', 'Comfortaa', 'Righteous', 'Fredoka One',
    'Balsamiq Sans', 'Lobster', 'Pacifico', 'Dancing Script', 'Shadows Into Light',
    'Amatic SC', 'Caveat', 'Indie Flower', 'Satisfy', 'Courgette', 'Permanent Marker'
];

export const GoogleFontsModal = ({ isOpen, onClose, onSelect, currentDefault, onSetDefault }: GoogleFontsModalProps) => {
    const [apiKey, setApiKey] = useState<string>('');
    const [fonts, setFonts] = useState<GoogleFont[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [subsetFilter, setSubsetFilter] = useState<string>('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load favorites from local storage
    useEffect(() => {
        const savedFavs = localStorage.getItem('google_fonts_favorites');
        if (savedFavs) {
            try {
                setFavorites(JSON.parse(savedFavs));
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }
    }, []);

    const toggleFavorite = (family: string) => {
        setFavorites(prev => {
            const next = prev.includes(family)
                ? prev.filter(f => f !== family)
                : [...prev, family];
            localStorage.setItem('google_fonts_favorites', JSON.stringify(next));
            return next;
        });
    };

    // Initial check for API Key
    useEffect(() => {
        const envKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
        if (envKey) {
            setApiKey(envKey);
            fetchFonts(envKey);
        } else {
            // Check local storage if previously entered
            const localKey = localStorage.getItem('google_fonts_api_key');
            if (localKey) {
                setApiKey(localKey);
                fetchFonts(localKey);
            }
        }
    }, []);

    const fetchFonts = async (key: string) => {
        if (!key) return;
        setLoading(true);
        setError(null);
        try {
            // Sort by popularity and limit to top 200 to reduce load
            const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${key}`);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            if (data.items) {
                setFonts(data.items);
            }
        } catch (err: any) {
            console.error('Failed to fetch fonts:', err);
            setError(err.message || 'Failed to load fonts');
            if (err.message.includes('API key')) {
                setApiKey(''); // Reset to allow re-entry
                localStorage.removeItem('google_fonts_api_key');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            localStorage.setItem('google_fonts_api_key', apiKey);
            fetchFonts(apiKey);
        }
    };

    const handleSelect = (font: GoogleFont) => {
        // Load the font preview dynamically if not already loaded
        // Logic handled in parent, but here we just pass it back
        onSelect(font.family);
        onClose();
    };

    const filteredFonts = fonts.filter(f => {
        const matchesSearch = f.family.toLowerCase().includes(search.toLowerCase());
        const matchesSubset = subsetFilter === 'all' || f.subsets.includes(subsetFilter);
        return matchesSearch && matchesSubset;
    }).sort((a, b) => {
        const aFav = favorites.includes(a.family);
        const bFav = favorites.includes(b.family);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0; // Keep existing popularity sort
    });

    // Dynamically load previews for visible fonts would be complex without intersection observer.
    // For now, we rely on the parent to handle the actual loading, 
    // BUT to show a preview here, we should load it.
    // To avoid loading 200 fonts at once, we can just load the requested ones or use a simple preview image?
    // Google Fonts API doesn't provide preview images directly.
    // We can use the Google Fonts CSS api with text param for optimization?
    // e.g. https://fonts.googleapis.com/css2?family=FontName&text=Preview&display=swap

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <span className="p-1.5 bg-primary/20 text-primary rounded-lg text-xs">GF</span>
                                Google Fonts
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {!apiKey && !loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-muted animate-spin-slow" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">API Key Required</h3>
                                        <p className="text-sm text-muted max-w-xs mx-auto">
                                            Please provide a Google Fonts API Key to access the library.
                                        </p>
                                    </div>
                                    <form onSubmit={handleKeySubmit} className="w-full max-w-sm space-y-3">
                                        <input
                                            type="text"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Paste API Key here..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={!apiKey.trim()}
                                            className="w-full py-3 bg-primary text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            Connect Library
                                        </button>
                                        <p className="text-[10px] text-muted/50">
                                            The key will be saved locally for this browser.
                                        </p>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    {/* Search Bar */}
                                    <div className="p-4 border-b border-white/5 bg-black/20">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                                <input
                                                    type="text"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Search fonts..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <select
                                                value={subsetFilter}
                                                onChange={(e) => setSubsetFilter(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-muted"
                                            >
                                                <option value="all">All Scripts</option>
                                                <option value="cyrillic">Cyrillic (Монгол)</option>
                                                <option value="latin">Latin</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Font List */}
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                <p className="text-xs text-muted font-bold uppercase tracking-widest">Loading Library...</p>
                                            </div>
                                        ) : error ? (
                                            <div className="flex flex-col items-center justify-center h-40 space-y-4 text-red-400">
                                                <p className="text-sm font-bold text-center">{error}</p>
                                                <button onClick={() => setApiKey('')} className="text-xs underline opacity-70 hover:opacity-100">
                                                    Reset API Key
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {filteredFonts.slice(0, 100).map((font) => (
                                                    <FontCard
                                                        key={font.family}
                                                        font={font}
                                                        isFavorite={favorites.includes(font.family)}
                                                        isDefault={currentDefault === font.family}
                                                        onToggleFavorite={() => toggleFavorite(font.family)}
                                                        onSetDefault={() => onSetDefault(font.family)}
                                                        onSelect={() => handleSelect(font)}
                                                    />
                                                ))}
                                                {filteredFonts.length === 0 && (
                                                    <div className="col-span-full py-10 text-center text-muted text-sm">
                                                        No fonts found matching "{search}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Sub-component for individual font card to handle its own preview loading
const FontCard = ({ font, onSelect, isFavorite, onToggleFavorite, isDefault, onSetDefault }: { font: GoogleFont, onSelect: () => void, isFavorite: boolean, onToggleFavorite: () => void, isDefault: boolean, onSetDefault: () => void }) => {

    // We can use a simple trick to load the font style for the preview:
    // Append a <link> with &text=PreviewText to minimize size
    useEffect(() => {
        const linkId = `preview-font-${font.family.replace(/\s+/g, '-')}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/\s+/g, '+')}&text=${encodeURIComponent(font.family)}&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, [font.family]);

    return (
        <button
            onClick={onSelect}
            className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all active:scale-95 text-center overflow-hidden"
        >
            <span
                className="text-2xl leading-none text-white transition-transform group-hover:scale-110"
                style={{ fontFamily: `"${font.family}", sans-serif` }}
            >
                {font.family}
            </span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest truncate w-full group-hover:text-primary transition-colors">
                {font.category}
            </span>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3 text-primary" />
            </div>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer z-10"
            >
                <Star className={cn("w-3.5 h-3.5 transition-colors", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted hover:text-white")} />
            </div>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault();
                }}
                className={cn(
                    "absolute bottom-2 right-2 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all z-10",
                    isDefault ? "bg-green-500 text-white cursor-default" : "bg-white/10 text-muted hover:bg-white/20 hover:text-white cursor-pointer"
                )}
                title={isDefault ? "Current Default" : "Set as Default"}
            >
                {isDefault ? "Default" : "Set Default"}
            </div>
        </button>
    );
};
