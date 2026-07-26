'use client';

import React, { useState, useRef, useEffect, useCallback, Fragment, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Type, Move, Trash2, Plus, Sliders, ChevronDown, ChevronUp,
    AlignCenter, AlignLeft, AlignRight, Bold, Italic,
    Maximize2, Minimize2, Save, Sparkles, Wand2, Languages, CircleDashed, Eraser,
    RotateCcw, RotateCw, Copy, FileText, Hash, ArrowLeft, Download, Loader2, Square, Blend, Droplet, Minus, Check, LayoutTemplate,
    Eye, EyeOff, Lock, Unlock, FileImage, MousePointer2, Crop, LayoutGrid, Smile, Brush, ScanLine, Layers, Zap, Star, Clipboard, Paintbrush,
    Upload
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StylePainter, StylePainterAPI } from './editor/StylePainter';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/app/actions/upload-image';
import Tesseract from 'tesseract.js';
import { BubbleDetector } from '@/utils/ai/BubbleDetector';
import { ImageCleaner } from '@/utils/ai/ImageCleaner';
import { GoogleFontsModal } from './GoogleFontsModal';
import { EditorAcademy } from './EditorAcademy';
import { parseCTPR } from '@/lib/ctpr-importer';
import { ImageItem, TextObject, EraserObject, ActiveTabType, StyleSubTabType, ChapterItem } from './editor/types';

// --- HOTKEYS CONFIG ---
// T: Add Text
// E: Toggle Eraser
// V: Move (Cancel other tools)
// Del/Backspace: Delete Object
// [ ]: Size Down/Up
// Ctrl+S: Save



interface AdvancedEditorProps {
    chapters: ChapterItem[];
    onClose: () => void;
    // Updated signature to pass clean and baked images
    onSaveChapter: (chapterId: string, finalImages: { id: string, file: File, name: string }[], objects: TextObject[], drawings: EraserObject[], cleanImages?: { id: string, file: File, name: string }[], silent?: boolean) => void;
    onAddChapter?: () => void;
    onDeleteChapter?: (chapterId: string) => void;
    onCleanAll: () => Promise<void>;
    onUpdateImage?: (chapterId: string, imageId: string, newUrl: string, file?: File) => void;
    isCleaning: boolean;
    mode: 'translator' | 'cleaner';
    backendUrl: string;
}

const FONTS = [
    { name: 'Mogul Irina', value: '"Mogul Irina", sans-serif' },
    // Segoe UI Family
    { name: 'Segoe UI', value: '"Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Italic', value: '"Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Bold', value: '"Segoe UI", sans-serif', weight: 'bold', family: 'Segoe UI' },
    { name: 'Segoe UI Bold Italic', value: '"Segoe UI", sans-serif', weight: 'bold', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Light', value: '"Segoe UI Light", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Light Italic', value: '"Segoe UI Light", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Semilight', value: '"Segoe UI Semilight", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Semilight Italic', value: '"Segoe UI Semilight", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Semibold', value: '"Segoe UI Semibold", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Semibold Italic', value: '"Segoe UI Semibold", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Black', value: '"Segoe UI Black", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Black Italic', value: '"Segoe UI Black", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },

    // Segoe Print Family
    { name: 'Segoe Print', value: '"Segoe Print", sans-serif', family: 'Segoe Print' },
    { name: 'Segoe Print Bold', value: '"Segoe Print", sans-serif', weight: 'bold', family: 'Segoe Print' },

    // Other System Fonts
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Arial Black', value: '"Arial Black", Arial, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },

    // Google Fonts
    { name: 'Pangolin', value: 'var(--font-pangolin), sans-serif' },
    { name: 'Neucha', value: 'var(--font-neucha), cursive' },
    { name: 'Rubik', value: 'var(--font-rubik), sans-serif' },
    { name: 'Oswald', value: 'var(--font-oswald), sans-serif' },
    { name: 'Bangers', value: 'var(--font-bangers), cursive' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto Condensed', value: 'var(--font-roboto-condensed), sans-serif' },
    { name: 'Montserrat', value: 'var(--font-montserrat), sans-serif' },
    { name: 'Playfair Display', value: 'var(--font-playfair), serif' },
    { name: 'Lora', value: 'var(--font-lora), serif' },
    { name: 'Nunito', value: 'var(--font-nunito), sans-serif' },
    { name: 'Ubuntu', value: 'var(--font-ubuntu), sans-serif' },
    { name: 'Caveat', value: 'var(--font-caveat), cursive' },
    { name: 'Lobster', value: 'var(--font-lobster), cursive' },
    { name: 'Amatic SC', value: 'var(--font-amatic), cursive' },
    { name: 'Russo One', value: 'var(--font-russo), sans-serif' },
    { name: 'Press Start 2P', value: 'var(--font-press-start), cursive' },
    { name: 'Comfortaa', value: 'var(--font-comfortaa), sans-serif' },
    { name: 'Exo 2', value: 'var(--font-exo2), sans-serif' },
    { name: 'Marck Script', value: 'var(--font-marck), cursive' },
    { name: 'Bad Script', value: 'var(--font-bad-script), cursive' },
    { name: 'Fira Sans', value: 'var(--font-fira), sans-serif' },
    { name: 'Balsamiq Sans', value: 'var(--font-balsamiq), sans-serif' },
    { name: 'Metal Mania', value: 'var(--font-metal-mania), cursive' },
    { name: 'Creepster', value: 'var(--font-creepster), cursive' },
    { name: 'Luckiest Guy', value: 'var(--font-luckiest-guy), cursive' },
    { name: 'Komika', value: 'system-ui, sans-serif' } // Fallback
];

const STYLE_PRESETS = [
    {
        id: 'ignition',
        name: 'Ignition',
        style: {
            fontFamily: 'var(--font-metal-mania), cursive',
            color: '#ffdd00',
            color2: '#ff0000',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#ffffff',
            strokeWidth: 4,
            glowColor: '#ff0000',
            glowBlur: 15,
            glowOpacity: 0.8,
            shadowColor: '#000000',
            shadowBlur: 10,
            shadowOffsetX: 4,
            shadowOffsetY: 4,
            shadowOpacity: 0.5,
            fontWeight: '900'
        },
        previewIcon: '🔥'
    },
    {
        id: 'horror',
        name: 'Horror',
        style: {
            fontFamily: 'var(--font-creepster), cursive',
            color: '#ff0000',
            color2: '#4a0000',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#000000',
            strokeWidth: 2,
            glowColor: '#ff0000',
            glowBlur: 10,
            glowOpacity: 0.4,
            shadowColor: '#000000',
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 1,
            fontWeight: 'normal'
        },
        previewIcon: '🧟'
    },
    {
        id: 'action',
        name: 'Action',
        style: {
            fontFamily: 'var(--font-luckiest-guy), cursive',
            color: '#ffffff',
            color2: '#0099ff',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#000000',
            strokeWidth: 8,
            shadowColor: '#000000',
            shadowBlur: 0,
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            shadowOpacity: 1,
            fontWeight: 'normal'
        },
        previewIcon: '💥'
    },
    {
        id: 'gold',
        name: 'Royal Gold',
        style: {
            fontFamily: 'var(--font-playfair), serif',
            color: '#fff5bd',
            color2: '#b38b00',
            gradientEnabled: true,
            gradientAngle: 135,
            strokeColor: '#5c4b00',
            strokeWidth: 1,
            shadowColor: '#000000',
            shadowBlur: 10,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowOpacity: 0.3,
            fontWeight: '900'
        },
        previewIcon: '👑'
    },
    {
        id: 'neon',
        name: 'Neon Pink',
        style: {
            fontFamily: 'var(--font-russo), sans-serif',
            color: '#ffffff',
            strokeColor: '#ff00ff',
            strokeWidth: 1,
            glowColor: '#ff00ff',
            glowBlur: 20,
            glowOpacity: 0.9,
            shadowColor: '#ff00ff',
            shadowBlur: 40,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0.5,
            fontWeight: 'normal'
        },
        previewIcon: '💖'
    }
];

// --- PREMIUM UI SUB-COMPONENTS ---
const NavBtn = ({ active, icon: Icon, label, onClick, danger, highlight }: any) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={cn(
            "flex flex-col items-center gap-1.5 p-3 min-w-[72px] transition-all duration-300",
            active ? (highlight ? "text-primary" : "text-white") : "text-muted hover:text-white/80"
        )}
    >
        <div className={cn(
            "p-4 rounded-[22px] transition-all duration-300",
            active ? (highlight ? "bg-primary text-white shadow-[0_8px_20px_rgba(var(--primary),0.3)]" : "bg-white/10") : "bg-transparent",
            danger && "text-red-500 hover:bg-red-500/10"
        )}>
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

const ToolBtn = ({ active, icon: Icon, label, onClick }: any) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={cn(
            "flex flex-col items-center gap-1.5 p-2 min-w-[72px] transition-all duration-300 group",
            active ? "text-primary" : "text-muted hover:text-white"
        )}
    >
        <div className={cn(
            "p-3.5 rounded-2xl transition-all duration-300 border backdrop-blur-md relative overflow-hidden",
            active
                ? "bg-gradient-to-br from-primary to-primary/80 text-white scale-110 shadow-[0_0_20px_rgba(var(--primary),0.5)] border-primary/50"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105 hover:border-white/20 hover:shadow-lg"
        )}>
            <div className={cn("absolute inset-0 bg-white/20 transition-opacity duration-300", active ? "opacity-0" : "opacity-0 group-hover:opacity-100")} />
            <Icon className="w-5 h-5 relative z-10" />
        </div>
        <span className={cn(
            "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
            active ? "text-white scale-105" : "text-muted group-hover:text-white"
        )}>{label}</span>
    </button>
);

export default function AdvancedEditor({
    chapters, onClose, onSaveChapter, onAddChapter, onDeleteChapter, onCleanAll, onUpdateImage, isCleaning, mode, backendUrl
}: AdvancedEditorProps) {
    const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0]?.id || '');

    // Custom Fonts Management
    const [localFonts, setLocalFonts] = useState(FONTS);
    const [isFontModalOpen, setIsFontModalOpen] = useState(false);
    const [isManagingFonts, setIsManagingFonts] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

    useEffect(() => {
        const savedFavs = localStorage.getItem('google_fonts_favorites');
        if (savedFavs) {
            try {
                setFavorites(JSON.parse(savedFavs));
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }

        // Fetch custom fonts from Supabase
        const fetchCustomFonts = async () => {
            const { data, error } = await supabase
                .from('custom_fonts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Failed to fetch custom fonts", error);
                return;
            }

            if (data && data.length > 0) {
                const loadedFonts = await Promise.all(data.map(async (font: any) => {
                    const fontName = font.name;
                    const fontUrl = font.url;

                    try {
                        const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                        await fontFace.load();
                        document.fonts.add(fontFace);
                        return {
                            name: fontName,
                            value: `"${fontName}", sans-serif`,
                            family: fontName,
                            isCustom: true
                        };
                    } catch (e) {
                        console.error(`Failed to load font ${fontName}`, e);
                        return null;
                    }
                }));

                const validFonts = loadedFonts.filter(f => f !== null) as typeof FONTS;
                setLocalFonts(prev => [...prev, ...validFonts]);
            }
        };

        fetchCustomFonts();
    }, []);

    const toggleFavorite = (fontFamily: string) => {
        setFavorites(prev => {
            const next = prev.includes(fontFamily)
                ? prev.filter(f => f !== fontFamily)
                : [...prev, fontFamily];
            localStorage.setItem('google_fonts_favorites', JSON.stringify(next));
            return next;
        });
    };

    // Sort fonts: Favorites first
    const sortedFonts = useMemo(() => {
        return [...localFonts].sort((a, b) => {
            const aFav = favorites.includes(a.name);
            const bFav = favorites.includes(b.name);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return 0;
        });
    }, [localFonts, favorites]);

    // Group fonts helper
    const groupedFonts = useMemo(() => {
        const groups: Record<string, typeof FONTS> = {};

        sortedFonts.forEach(f => {
            // Infer family: Use explicit family prop OR fallback logic (e.g. split by space)
            // For now, only Segoe UI and Segoe Print have generic families. Others are single.
            const family = (f as any).family || f.name;

            if (!groups[family]) {
                groups[family] = [];
            }
            groups[family].push(f);
        });

        // Convert to array for rendering. 
        // If sort logic needs to preserve favorite families at top:
        // A family is "favorite" if ANY of its members is favorite? Or just check first item?
        // Since sortedFonts is already sorted by favorite, the groups created should roughly follow that order
        // if we iterate and create keys in order. But Object.entries order isn't guaranteed (though usually insertion order).
        // Let's rely on insertion order for now.
        return Object.entries(groups).map(([family, variants]) => ({ family, variants }));
    }, [sortedFonts]);

    // Initial Font Load - Filter out hidden fonts
    useEffect(() => {
        const hiddenFonts = JSON.parse(localStorage.getItem('hidden_fonts') || '[]');
        if (hiddenFonts.length > 0) {
            setLocalFonts(prev => prev.filter(f => !hiddenFonts.includes(f.name)));
        }
    }, []);

    const toggleFontVisibility = (fontName: string) => {
        // Add to hidden list
        const hiddenFonts = JSON.parse(localStorage.getItem('hidden_fonts') || '[]');
        const newHidden = [...hiddenFonts, fontName];
        localStorage.setItem('hidden_fonts', JSON.stringify(newHidden));

        // Remove from current view
        setLocalFonts(prev => prev.filter(f => f.name !== fontName));
        toast.success(`${fontName} has been hidden`);
    };

    const restoreHiddenFonts = () => {
        localStorage.removeItem('hidden_fonts');
        setLocalFonts(FONTS);
        toast.success("All fonts restored!");
        setIsManagingFonts(false);
    };

    const handleGoogleFontSelect = (fontFamily: string) => {
        // Add to local list if not present
        const exists = localFonts.find(f => f.name === fontFamily);
        if (!exists) {
            // Add font link to head dynamically for immediate use in editor (redundant if Modal does it, but safer)
            const linkId = `font-${fontFamily.replace(/\s+/g, '-')}`;
            if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}&display=swap`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }

            const newFont = { name: fontFamily, value: `"${fontFamily}", sans-serif` };
            setLocalFonts(prev => [...prev, newFont]);

            if (selectedId) {
                updateObject(selectedId, { fontFamily: newFont.value });
            }
        } else {
            if (selectedId) {
                updateObject(selectedId, { fontFamily: exists.value });
            }
        }
    };

    // Initialize objectsMap from props (Restores state on open)
    const [objectsMap, setObjectsMap] = useState<Record<string, TextObject[]>>(() => {
        const map: Record<string, TextObject[]> = {};
        chapters.forEach(ch => {
            if (ch.objects) map[ch.id] = ch.objects;
        });
        return map;
    });

    const [drawingsMap, setDrawingsMap] = useState<Record<string, EraserObject[]>>(() => {
        const map: Record<string, EraserObject[]> = {};
        chapters.forEach(ch => {
            if (ch.drawings) map[ch.id] = ch.drawings;
        });
        return map;
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [rotatingId, setRotatingId] = useState<string | null>(null); // Optimization for rotation performance
    const [isMobileScriptOpen, setIsMobileScriptOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false); // Урьдчилан харах горим
    const [zoom, setZoom] = useState(1);
    const [activeTab, setActiveTab] = useState<ActiveTabType>('translate');
    const [styleSubTab, setStyleSubTab] = useState<StyleSubTabType>('basic');
    const [isSplitView, setIsSplitView] = useState(false); // Split Screen mode
    const [layerSettings, setLayerSettings] = useState({
        text: { visible: true, locked: false },
        drawings: { visible: true, locked: false },
        original: { visible: true, locked: true } // Original is locked by default
    });
    const [isSavingLocal, setIsSavingLocal] = useState(false);
    const [isEraserActive, setIsEraserActive] = useState(false);
    const [isTextToolActive, setIsTextToolActive] = useState(false);
    const [isMagicWandActive, setIsMagicWandActive] = useState(false);
    const [magicWandThreshold, setMagicWandThreshold] = useState(30);
    const [magicWandMode, setMagicWandMode] = useState<'solid' | 'gradient'>('solid');
    const [isRectToolActive, setIsRectToolActive] = useState(false);
    const [isGradientActive, setIsGradientActive] = useState(false);
    const [isBlendActive, setIsBlendActive] = useState(false);
    const [isPatchActive, setIsPatchActive] = useState(false);
    const [isInpaintActive, setIsInpaintActive] = useState(false);
    const [isContextAwareActive, setIsContextAwareActive] = useState(false); // Шинэ Tool (LaMa ONNX)
    const [blendSize, setBlendSize] = useState(30);
    const [blendStrength, setBlendStrength] = useState(0.5);
    const [currentInpaint, setCurrentInpaint] = useState<{ imageId: string, x1: number, y1: number, x2: number, y2: number } | null>(null);
    const [currentContextAware, setCurrentContextAware] = useState<{ imageId: string, x1: number, y1: number, x2: number, y2: number } | null>(null);
    const [currentPatch, setCurrentPatch] = useState<{ imageId: string, x1: number, y1: number, x2: number, y2: number, sx: number, sy: number } | null>(null);
    const [currentBlendPath, setCurrentBlendPath] = useState<{ imageId: string, points: { x: number, y: number }[] } | null>(null);
    const [currentGradient, setCurrentGradient] = useState<{ imageId: string, x1: number, y1: number, x2: number, y2: number, color1: string, color2: string } | null>(null);
    const [currentRect, setCurrentRect] = useState<{ imageId: string, startX: number, startY: number, endX: number, endY: number, color?: string } | null>(null);
    const [imageSnippets, setImageSnippets] = useState<Record<string, string>>({});
    const imageDataCache = useRef<Record<string, { data: Uint8ClampedArray, w: number, h: number }>>({});
    const [currentPath, setCurrentPath] = useState<{ imageId: string, points: { x: number, y: number }[] } | null>(null);
    const [showTextNumbers, setShowTextNumbers] = useState(true);
    const canvasRef = useRef<HTMLDivElement>(null);
    const bubbleDetector = useRef<BubbleDetector>(new BubbleDetector());
    const imageCleaner = useRef<ImageCleaner>(new ImageCleaner());
    const [aiProgress, setAIProgress] = useState<{ active: boolean, message: string, progress?: number }>({
        active: false,
        message: '',
        progress: 0
    });
    const skipAutoOpenRef = useRef(false);

    // FIX: Store initial base images to prevent "Taint Loop" (Ghost Text)
    // We always reconstruct from Base + Drawings + Objects. We never read back the 'Saved' image as source.
    const baseImagesRef = useRef<Record<string, string>>({});

    // Initialize base images when chapter changes (only if not already set for this chapter)
    useEffect(() => {
        if (!activeChapterId) return;
        chapters.forEach(ch => {
            if (ch.id === activeChapterId) {
                ch.images.forEach(img => {
                    if (!baseImagesRef.current[img.id]) {
                        // FIX: NEVER use translatedUrl as a base for source rendering. 
                        // Always Clean URL (AI Cleaned/Original) or Preview (Raw).
                        baseImagesRef.current[img.id] = img.cleanUrl || img.preview;
                    }
                });
            }
        });
    }, [activeChapterId, chapters]);

    // --- TOUCH HANDLING REFS ---
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isDrawingMode = useRef(false);
    const [isDrawingActive, setIsDrawingActive] = useState(false); // New state for dynamic touch-action
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const [isOCREnabled, setIsOCREnabled] = useState(true);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isCropActive, setIsCropActive] = useState(false);
    const [currentCrop, setCurrentCrop] = useState<{ imageId: string, startX: number, startY: number, endX: number, endY: number } | null>(null);
    const [mobileMode, setMobileMode] = useState<'tools' | 'fx' | 'text' | 'stickers' | 'draw' | 'view'>('tools');

    // Eraser Settings
    const [eraserSize, setEraserSize] = useState(20);

    // UX State
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);

    // Hand Tool State
    // Hand Tool & Viewport State
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    // Viewport State: X, Y, Scale
    const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
    const stylePainterRef = useRef<StylePainterAPI | null>(null);

    const panStart = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastTap = useRef<{ id: string, time: number } | null>(null);
    const isMounted = useRef(true);
    const isCommittedRef = useRef(false);
    const ctprInputRef = useRef<HTMLInputElement>(null);

    // Touch gesture state
    const touchStartDistance = useRef(0);
    const touchStartScale = useRef(1);
    const lastTouchCenter = useRef({ x: 0, y: 0 });

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // --- AUTO SAVE & RESTORE ---
    const [activeImageId, setActiveImageId] = useState<string | null>(null);

    // Observer for Active Page Highlight
    const visiblePagesRef = useRef<Map<string, number>>(new Map());
    useEffect(() => {
        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                const id = entry.target.id.replace('page-', '');
                if (entry.isIntersecting) {
                    visiblePagesRef.current.set(id, entry.intersectionRatio);
                } else {
                    visiblePagesRef.current.delete(id);
                }
            });

            // Find the page with the highest intersection ratio
            let maxRatio = 0;
            let activeId: string | null = null;

            visiblePagesRef.current.forEach((ratio, id) => {
                // Should also consider if the page is essentially "filling" the view
                if (ratio > maxRatio) {
                    maxRatio = ratio;
                    activeId = id;
                }
            });

            // If we have a clear winner or just one visible page
            if (activeId) {
                setActiveImageId(activeId);
            }
        };

        const observer = new IntersectionObserver(handleIntersect, {
            root: scrollContainerRef.current,
            // Track generic visibility. If an element covers the screen, threshold 0.5 might not trigger if zoomed active.
            // Using multiple thresholds gives us granular ratio updates.
            threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        });

        const elementsToObserve: Element[] = [];

        chapters.forEach(ch => {
            if (ch.id === activeChapterId) {
                ch.images.forEach(img => {
                    const el = document.getElementById(`page-${img.id}`);
                    if (el) {
                        observer.observe(el);
                        elementsToObserve.push(el);
                    }
                });
            }
        });

        return () => {
            observer.disconnect();
            visiblePagesRef.current.clear();
        };
    }, [activeChapterId, chapters]); // Re-run if chapter changes (elements change)

    // Sync Active Page with Selection
    useEffect(() => {
        if (selectedId) {
            const obj = objectsMap[activeChapterId]?.find(o => o.id === selectedId);
            if (obj) setActiveImageId(obj.imageId);
        }
    }, [selectedId, activeChapterId, objectsMap]);

    // --- DEFAULT FONT SETTING ---
    const [defaultFont, setDefaultFontState] = useState<string>('Mogul Irina');

    useEffect(() => {
        const savedFont = localStorage.getItem('editor_default_font');
        if (savedFont) {
            setDefaultFontState(savedFont);
        }
    }, []);

    const setDefaultFont = (font: string) => {
        setDefaultFontState(font);
        localStorage.setItem('editor_default_font', font);
        toast.success(`Default font set to ${font}`);
    };

    // Restore on load
    useEffect(() => {
        if (!activeChapterId) return;
        const backupKey = `editor_backup_${activeChapterId}`;
        try {
            const savedData = localStorage.getItem(backupKey);
            if (savedData) {
                const { objects, drawings, timestamp } = JSON.parse(savedData);

                // Only restore if valid data exists
                let restored = false;
                if (objects && Object.keys(objects).length > 0) {
                    setObjectsMap(prev => ({ ...prev, [activeChapterId]: objects }));
                    restored = true;
                }
                if (drawings && Object.keys(drawings).length > 0) {
                    setDrawingsMap(prev => ({ ...prev, [activeChapterId]: drawings }));
                    restored = true;
                }

                if (restored) {
                    toast.success("Өмнөх засваруудыг амжилттай сэргээлээ", {
                        description: new Date(timestamp).toLocaleString()
                    });
                }
            }
        } catch (e) {
            console.error("Failed to restore backup", e);
        }
    }, [activeChapterId]);

    // Auto-save on change
    // KEEP REFS UPDATED
    const objectsRef = useRef(objectsMap);
    const drawingsRef = useRef(drawingsMap);
    useEffect(() => {
        objectsRef.current = objectsMap;
        drawingsRef.current = drawingsMap;
    }, [objectsMap, drawingsMap]);

    // Robust Auto-save (Handles Unmount & Page Close)
    useEffect(() => {
        if (!activeChapterId) return;

        const saveToLocal = () => {
            if (isCommittedRef.current) return;

            const currentObjects = objectsRef.current[activeChapterId];
            const currentDrawings = drawingsRef.current[activeChapterId];

            if ((currentObjects && currentObjects.length > 0) || (currentDrawings && currentDrawings.length > 0)) {
                const backupKey = `editor_backup_${activeChapterId}`;
                const dataToSave = {
                    objects: currentObjects,
                    drawings: currentDrawings,
                    timestamp: Date.now()
                };
                localStorage.setItem(backupKey, JSON.stringify(dataToSave));
            }
        };

        // Save on window close/refresh
        const handleBeforeUnload = () => saveToLocal();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveToLocal(); // Critical: Save on component unmount
        };
    }, [activeChapterId]);

    // Periodic Visual Feedback
    useEffect(() => {
        if (!activeChapterId) return;
        const timer = setTimeout(() => {
            const currentObjects = objectsMap[activeChapterId];
            const currentDrawings = drawingsMap[activeChapterId];
            if ((currentObjects?.length || currentDrawings?.length)) {
                const backupKey = `editor_backup_${activeChapterId}`;
                const dataToSave = {
                    objects: currentObjects,
                    drawings: currentDrawings,
                    timestamp: Date.now()
                };
                localStorage.setItem(backupKey, JSON.stringify(dataToSave));

                setIsSavingLocal(true);
                setTimeout(() => setIsSavingLocal(false), 800);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [objectsMap, drawingsMap, activeChapterId]);

    // VELOCITY: Style Persistence
    const lastUsedStyle = useRef({
        fontSize: 16,
        fontFamily: FONTS[0].value, // This will now be "Mogul Irina"
        color: '#000000',
        fontWeight: '600',
        strokeColor: 'transparent',
        strokeWidth: 0,
        textAlign: 'center' as const,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowOpacity: 0.5,
        glowColor: '#FFFFFF',
        glowBlur: 0,
        glowOpacity: 0.5,
        bgPaddingX: 10,
        bgPaddingY: 5,
        bgBorderRadius: 8,
        bgOpacity: 1,
        textDecoration: 'none' as const,
        gradientEnabled: false,
        color2: '#FFFFFF',
        gradientAngle: 180,
        lineHeight: 1.1,
        letterSpacing: 0
    });

    const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];
    const images = activeChapter?.images || [];
    const objects = objectsMap[activeChapterId] || [];
    const drawings = drawingsMap[activeChapterId] || [];

    const selectedObject = (objects.find(o => o.id === selectedId) || drawings.find(d => d.id === selectedId)) as any;
    const isMagicWandActiveRef = useRef(isMagicWandActive);

    // Auto-center viewport on initial load
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || images.length === 0) return;

        // Wait for layout to settle
        const timer = setTimeout(() => {
            const containerRect = container.getBoundingClientRect();
            const isMobile = window.innerWidth < 768;

            // Canvas total width including padding (80*2 for desktop, 16*2 for mobile)
            const paddingValue = isMobile ? 32 : 160;
            const canvasWidth = isMobile ? window.innerWidth : (isSplitView ? 1600 : 1000) + paddingValue;

            // Auto-scale for mobile if canvas is wider than container
            let scale = 1;
            const screenPadding = isMobile ? 10 : 40; // Marginal spacing from screen edges

            if (canvasWidth > containerRect.width - screenPadding) {
                scale = (containerRect.width - screenPadding) / canvasWidth;
            }

            const canvasScaledWidth = canvasWidth * scale;

            // Center horizontally (allow negative to center if still slightly wider)
            const centerX = isMobile ? 0 : (containerRect.width - canvasScaledWidth) / 2;
            const centerY = isMobile ? 0 : 50;

            setViewport({
                scale: scale,
                x: centerX,
                y: centerY
            });
        }, 150);

        return () => clearTimeout(timer);
    }, [images.length, isSplitView]);

    // Keep ref in sync
    useEffect(() => {
        isMagicWandActiveRef.current = isMagicWandActive;
    }, [isMagicWandActive]);

    // KEYBOARD SHORTCUTS: Zoom (Ctrl+Wheel), Focus (F), Hand (Space)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            // console.log("Wheel", { ctrl: e.ctrlKey, dy: e.deltaY, dx: e.deltaX });

            if (e.ctrlKey) {
                // SMOOTH ZOOM LOGIC (World Class feel)
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                setViewport(prev => {
                    // Use exponential scaling for a much smoother, consistent feel across zoom levels
                    // Lowering sensitivity (0.001) to prevent "sharp" jumps
                    const zoomSensitivity = 0.001;
                    let newScale = prev.scale * Math.exp(-e.deltaY * zoomSensitivity);

                    // Natural constraints: 0.1x to 10x
                    newScale = Math.max(0.1, Math.min(10, newScale));

                    if (isNaN(newScale)) newScale = 1;

                    // Calculate the position shift to zoom towards the mouse cursor
                    const scaleFactor = newScale / (prev.scale || 1);

                    return {
                        scale: newScale,
                        x: mouseX - (mouseX - prev.x) * scaleFactor,
                        y: mouseY - (mouseY - prev.y) * scaleFactor
                    };
                });
            } else {
                // PAN LOGIC (Wheel)
                setViewport(prev => ({
                    ...prev,
                    x: prev.x - e.deltaX,
                    y: prev.y - e.deltaY
                }));
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement?.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.code === 'Space' && !e.repeat) {
                setIsSpacePressed(true);
            }
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
                setIsFocusMode(prev => !prev);
                toast(isFocusMode ? "Focus Mode Off" : "Focus Mode On");
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isFocusMode]); // Add isFocusMode dependency to refresh if needed (mostly needed for closure if using state)

    // Sequential numbering based on visual order (Image index -> Y position)
    const sortedObjects = React.useMemo(() => {
        return [...objects].sort((a, b) => {
            const imgAIdx = images.findIndex(i => i.id === a.imageId);
            const imgBIdx = images.findIndex(i => i.id === b.imageId);
            if (imgAIdx !== imgBIdx) return imgAIdx - imgBIdx;
            return a.y - b.y;
        });
    }, [objects, images]);

    // VELOCITY: Auto-focus and scroll to selected object's input
    useEffect(() => {
        if (!selectedId) return;

        const focusInput = () => {
            const el = document.getElementById(`textarea-${selectedId}`);
            if (el) {
                if (skipAutoOpenRef.current) {
                    el.focus();
                }
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            skipAutoOpenRef.current = false;
        };

        if (activeTab !== 'translate') {
            setActiveTab('translate');
            // Give a bit more time for React to render the tab content
            const timer = setTimeout(focusInput, 200);
            return () => clearTimeout(timer);
        } else {
            focusInput();
        }
    }, [selectedId]); // Keep dependency size constant

    const copyScript = useCallback(() => {
        if (sortedObjects.length === 0) {
            toast.error("Хуулах текст олдсонгүй");
            return;
        }
        const script = sortedObjects.map((obj, i) => `${i + 1}: ${obj.text}`).join('\n');
        navigator.clipboard.writeText(script);
        toast.success("Хуулагдлаа!");
    }, [sortedObjects]);

    // Mobile: Auto-open drawer when selecting an object (DISABLED for Picsart Overhaul)
    /* 
    useEffect(() => {
        if (selectedId && window.innerWidth < 768) {
            if (skipAutoOpenRef.current) {
                skipAutoOpenRef.current = false;
                return;
            }
            if (isMagicWandActiveRef.current) return;
     
            setIsMobileScriptOpen(true);
            setTimeout(() => {
                const el = document.getElementById(`mobile-input-${selectedId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus();
            }, 300);
        }
    }, [selectedId]);
    */

    // --- HISTORY STATE ---
    type HistorySnapshot = { objects: TextObject[], drawings: EraserObject[], imageMap: Record<string, string> };
    const [historyMap, setHistoryMap] = useState<Record<string, { past: HistorySnapshot[], future: HistorySnapshot[] }>>({});

    const saveHistory = () => {
        setHistoryMap(prev => {
            const currentHistory = prev[activeChapterId] || { past: [], future: [] };
            const snapshot: HistorySnapshot = {
                objects: objectsMap[activeChapterId] || [],
                drawings: drawingsMap[activeChapterId] || [],
                imageMap: images.reduce((acc, img) => ({ ...acc, [img.id]: img.translatedUrl || img.preview }), {})
            };

            // Limit history size to 20 steps to save memory
            const newPast = [...currentHistory.past, snapshot].slice(-20);

            return {
                ...prev,
                [activeChapterId]: {
                    past: newPast,
                    future: []
                }
            };
        });
    };

    const undo = () => {
        const history = historyMap[activeChapterId];
        if (!history || history.past.length === 0) return;

        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);

        const currentSnapshot: HistorySnapshot = {
            objects: objectsMap[activeChapterId] || [],
            drawings: drawingsMap[activeChapterId] || [],
            imageMap: images.reduce((acc, img) => ({ ...acc, [img.id]: img.translatedUrl || img.preview }), {})
        };

        setHistoryMap(prev => ({
            ...prev,
            [activeChapterId]: {
                past: newPast,
                future: [currentSnapshot, ...history.future]
            }
        }));

        setObjectsMap(prev => ({ ...prev, [activeChapterId]: previous.objects }));
        setDrawingsMap(prev => ({ ...prev, [activeChapterId]: previous.drawings }));

        // Restore images if changed
        if (onUpdateImage && previous.imageMap && currentSnapshot.imageMap) {
            Object.entries(previous.imageMap).forEach(([imgId, url]) => {
                const currentUrl = currentSnapshot.imageMap[imgId];
                if (currentUrl !== url) {
                    onUpdateImage(activeChapterId, imgId, url);
                }
            });
        }
        // toast("Undo", { position: 'bottom-center' });
    };

    const redo = () => {
        const history = historyMap[activeChapterId];
        if (!history || history.future.length === 0) return;

        const next = history.future[0];
        const newFuture = history.future.slice(1);

        const currentSnapshot: HistorySnapshot = {
            objects: objectsMap[activeChapterId] || [],
            drawings: drawingsMap[activeChapterId] || [],
            imageMap: images.reduce((acc, img) => ({ ...acc, [img.id]: img.translatedUrl || img.preview }), {})
        };

        setHistoryMap(prev => ({
            ...prev,
            [activeChapterId]: {
                past: [...history.past, currentSnapshot],
                future: newFuture
            }
        }));

        setObjectsMap(prev => ({ ...prev, [activeChapterId]: next.objects }));
        setDrawingsMap(prev => ({ ...prev, [activeChapterId]: next.drawings }));

        // Restore images if changed
        if (onUpdateImage && next.imageMap && currentSnapshot.imageMap) {
            Object.entries(next.imageMap).forEach(([imgId, url]) => {
                const currentUrl = currentSnapshot.imageMap[imgId];
                if (currentUrl !== url) {
                    onUpdateImage(activeChapterId, imgId, url);
                }
            });
        }
        // toast("Redo", { position: 'bottom-center' });
    };


    // --- SMART TYPESETTING (AUTO-FIT) ---
    const calculateAutoFit = (obj: TextObject) => {
        // 1. Calculate Usable Area with a strict safety margin (User requested 75% context)
        const padX = (obj.bgPaddingX || 10) * 2;
        const padY = (obj.bgPaddingY || 10) * 2;
        const safetyFactor = 0.75; // 75% constraint
        const availableWidth = (obj.width - padX) * safetyFactor;

        const boxHeight = obj.height && obj.height > 20
            ? obj.height
            : (obj.width * 0.8);

        const availableHeight = (boxHeight - padY) * safetyFactor;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const text = obj.text;
        // Capture trailing whitespace to preserve it during real-time typing
        const trailingSpaceMatch = text.match(/[\s\n]+$/);
        const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : "";

        const cleanText = text.trim();
        if (!cleanText) return { fontSize: 80, text }; // Default for empty

        const words = cleanText.replace(/\n/g, ' ').split(/\s+/);

        const tryLayout = (fontSize: number): string[] | null => {
            ctx.font = `${obj.fontWeight || 'normal'} ${fontSize}px "${obj.fontFamily}"`;
            const lines: string[] = [];
            let currentLine = "";

            for (let i = 0; i < words.length; i++) {
                let word = words[i];
                if (ctx.measureText(word).width > availableWidth) {
                    return null; // This font size is too large for this word
                }
                const testLine = currentLine ? currentLine + " " + word : word;
                if (ctx.measureText(testLine).width <= availableWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);

            const lineH = obj.lineHeight || 1.2;
            const totalHeight = lines.length * fontSize * lineH;
            if (totalHeight > availableHeight) return null;
            return lines;
        };

        let optimalSize = 8;
        let optimalLines = [cleanText];
        for (let s = 80; s >= 8; s--) {
            const lines = tryLayout(s);
            if (lines) {
                optimalSize = s;
                optimalLines = lines;
                break;
            }
        }

        return {
            fontSize: optimalSize,
            text: optimalLines.join('\n') + trailingSpace
        };
    };

    const handleAutoFit = () => {
        if (!selectedId || !selectedObject) return;
        if (!selectedObject.autoFitEnabled) {
            toast.error("Auto-fit is only available for speech bubbles", { icon: 'ℹ️' });
            return;
        }
        const result = calculateAutoFit(selectedObject);
        if (!result) return;

        setObjectsMap(prev => {
            const list = prev[activeChapterId].map(o => o.id === selectedId ? {
                ...o,
                fontSize: result.fontSize,
                text: result.text,
                lineHeight: 1.2
            } : o);
            return { ...prev, [activeChapterId]: list };
        });
        toast.success(`Таарууллаа! Size: ${result.fontSize}`, { icon: '✨' });
    };

    // --- MAGIC WAND LOGIC ---
    const handleMagicWand = async (imageId: string, startX: number, startY: number) => {
        const t = undefined; // toast.loading("Бөмбөлгийг мэдэрч байна...");
        try {
            let cache = imageDataCache.current[imageId];
            let canvasW: number, canvasH: number;
            let data: Uint8ClampedArray;

            if (!cache) {
                const img = images.find(i => i.id === imageId);
                if (!img) return;

                const url = img.translatedUrl || img.preview;

                // Use fetch + createImageBitmap to bypass mobile browser downsampling
                const response = await fetch(url);
                const blob = await response.blob();
                const image = await createImageBitmap(blob);

                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return;
                ctx.drawImage(image, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                cache = { data: imageData.data, w: canvas.width, h: canvas.height };
                imageDataCache.current[imageId] = cache;
            }

            data = cache.data;
            canvasW = cache.w;
            canvasH = cache.h;

            const pxX = Math.round(startX * canvasW);
            const pxY = Math.round(startY * canvasH);

            // Calculate scale for Font Size (Natural / Display)
            let scale = 1;
            const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
            if (imgEl) {
                const rect = imgEl.getBoundingClientRect();
                scale = canvasW / (rect.width / viewport.scale);
            }



            // 1. First Flood Fill to find the bubble interior & track bounding box
            const stack: [number, number][] = [[pxX, pxY]];
            const visited = new Uint8Array(canvasW * canvasH);
            const targetIdx = (pxY * canvasW + pxX) * 4;
            const targetR = data[targetIdx];
            const targetG = data[targetIdx + 1];
            const targetB = data[targetIdx + 2];
            const threshold = magicWandThreshold;

            let minX = pxX, maxX = pxX, minY = pxY, maxY = pxY;

            while (stack.length > 0) {
                const [x, y] = stack.pop()!;
                const idx = y * canvasW + x;
                if (x < 0 || x >= canvasW || y < 0 || y >= canvasH || visited[idx]) continue;
                visited[idx] = 1;

                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;

                const dIdx = idx * 4;
                const diff = Math.sqrt(
                    Math.pow(data[dIdx] - targetR, 2) +
                    Math.pow(data[dIdx + 1] - targetG, 2) +
                    Math.pow(data[dIdx + 2] - targetB, 2)
                );
                if (diff < threshold) {
                    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                }
            }

            // --- LOCALIZED PROCESSING AREA (Optimization) ---
            const padding = 20;
            const localX1 = Math.max(0, minX - padding);
            const localY1 = Math.max(0, minY - padding);
            const localX2 = Math.min(canvasW, maxX + padding);
            const localY2 = Math.min(canvasH, maxY + padding);

            // 2. Second Flood Fill: Only seed from local borders to find EXTERIOR within the box
            const exterior = new Uint8Array(canvasW * canvasH);
            const extStack: [number, number][] = [];
            // Seed the edges of our bounding box
            for (let x = localX1; x < localX2; x++) { extStack.push([x, localY1], [x, localY2 - 1]); }
            for (let y = localY1; y < localY2; y++) { extStack.push([localX1, y], [localX2 - 1, y]); }

            while (extStack.length > 0) {
                const [x, y] = extStack.pop()!;
                const idx = y * canvasW + x;
                if (x < localX1 || x >= localX2 || y < localY1 || y >= localY2 || exterior[idx] || visited[idx]) continue;
                exterior[idx] = 1;
                extStack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }

            // 2.5 SMART EROSION (Shrink mask by ~N px to preserve anti-aliased borders)
            let mask = new Uint8Array(canvasW * canvasH);
            for (let y = localY1; y < localY2; y++) {
                const offset = y * canvasW;
                for (let x = localX1; x < localX2; x++) {
                    if (!exterior[offset + x]) mask[offset + x] = 1;
                }
            }

            // Perform Erosion (User requested 2px gap from line)
            // We need to erode enough to clear the anti-aliasing fuzz + 2px safety.
            // A typical line is 3-5px.
            // Let's set a fixed erosion of 4 pixels (approx 2px for AA + 2px gap) for high-res images

            const erosionPasses = 12; // Increased to 12 for high-res clarity

            for (let pass = 0; pass < erosionPasses; pass++) {
                const nextMask = new Uint8Array(canvasW * canvasH);
                for (let y = localY1; y < localY2; y++) {
                    const offset = y * canvasW;
                    for (let x = localX1; x < localX2; x++) {
                        const idx = offset + x;
                        if (mask[idx]) {
                            // Check 4-neighbors. If ANY is 0, this pixel must be eroded (become 0)
                            let keep = true;
                            if (x + 1 < localX2 && !mask[idx + 1]) keep = false;
                            else if (x - 1 >= localX1 && !mask[idx - 1]) keep = false;
                            else if (y + 1 < localY2 && !mask[idx + canvasW]) keep = false;
                            else if (y - 1 >= localY1 && !mask[idx - canvasW]) keep = false;

                            if (keep) nextMask[idx] = 1;
                        }
                    }
                }
                mask = nextMask;
            }

            // 3. Final Mask within Bounding Box
            const rowGroups: Record<number, number[]> = {};
            let hasPixels = false;
            for (let y = localY1; y < localY2; y++) {
                const offset = y * canvasW;
                for (let x = localX1; x < localX2; x++) {
                    if (mask[offset + x]) {
                        if (!rowGroups[y]) rowGroups[y] = [];
                        rowGroups[y].push(x);
                        hasPixels = true;
                    }
                }
            }

            if (!hasPixels) {
                toast.error("Бөмбөлгийг таньж чадсангүй", { id: t });
                return;
            }

            saveHistory();
            const sampledHex = `#${((1 << 24) + (targetR << 16) + (targetG << 8) + targetB).toString(16).slice(1)}`;

            // --- VERTICAL MERGING (Only in local bounds) ---
            const rects: { x1: number, x2: number, y1: number, y2: number }[] = [];
            const rowSegments: { x1: number, x2: number }[][] = [];

            for (let y = localY1; y < localY2; y++) {
                const segments: { x1: number, x2: number }[] = [];
                const row = rowGroups[y] || [];
                if (row.length > 0) {
                    let start = row[0];
                    for (let i = 1; i <= row.length; i++) {
                        if (i === row.length || row[i] !== row[i - 1] + 1) {
                            segments.push({ x1: start, x2: row[i - 1] + 1 });
                            if (i < row.length) start = row[i];
                        }
                    }
                }
                rowSegments[y] = segments;
            }

            // Merge vertically
            const activeRects: { x1: number, x2: number, y1: number }[] = [];
            for (let y = localY1; y < localY2; y++) {
                const currentSegments = rowSegments[y] || [];
                // Check which active rects continue
                for (let i = activeRects.length - 1; i >= 0; i--) {
                    const rect = activeRects[i];
                    const segIdx = currentSegments.findIndex(s => s.x1 === rect.x1 && s.x2 === rect.x2);
                    if (segIdx === -1) {
                        // Rect ended
                        rects.push({ x1: rect.x1, x2: rect.x2, y1: rect.y1, y2: y });
                        activeRects.splice(i, 1);
                    } else {
                        // Rect continues, remove from current segments to avoid double processing
                        currentSegments.splice(segIdx, 1);
                    }
                }
                // New segments start
                currentSegments.forEach(s => activeRects.push({ x1: s.x1, x2: s.x2, y1: y }));
            }
            // Close remaining rects
            activeRects.forEach(r => rects.push({ x1: r.x1, x2: r.x2, y1: r.y1, y2: localY2 }));

            const pathArray: string[] = rects.map(r =>
                `M ${r.x1} ${r.y1} h ${r.x2 - r.x1} v ${r.y2 - r.y1} h ${-(r.x2 - r.x1)} z`
            );
            const pathData = pathArray.join(' ');

            if (!pathData) return;

            let color1 = sampledHex;
            let color2 = sampledHex;

            if (magicWandMode === 'gradient') {
                try {
                    const cX = Math.round((minX + maxX) / 2);
                    // Sample slightly outside or at the extreme edge
                    const topY = Math.max(0, minY - 2);
                    const botY = Math.min(canvasH - 1, maxY + 2);

                    const getHex = (px: number, py: number) => {
                        const i = (py * canvasW + px) * 4;
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                    };

                    color1 = getHex(cX, topY);
                    color2 = getHex(cX, botY);
                } catch (e) {
                    console.warn("Gradient sampling failed", e);
                }
            }

            const fillDrawing: EraserObject = {
                id: Math.random().toString(36).substr(2, 9),
                imageId,
                pathData,
                type: magicWandMode === 'gradient' ? 'gradient' : 'solid',
                x1: Math.round((minX + maxX) / 2),
                y1: minY,
                x2: Math.round((minX + maxX) / 2),
                y2: maxY,
                strokeWidth: 0,
                color: color1,
                color2: color2,
                isFill: true
            };

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), fillDrawing]
            }));

            // --- SMART ACTION: Automaticaly add a placeholder for translation ---
            const newTextId = Math.random().toString(36).substr(2, 9);
            const placeholderText: TextObject = {
                id: newTextId,
                imageId,
                text: '', // Empty placeholder for translation
                x: minX,
                y: minY,
                ...lastUsedStyle.current,
                fontSize: Math.min((lastUsedStyle.current.fontSize || 16) * scale, (maxY - minY) * 0.8),
                textAlign: 'center',
                fontStyle: 'normal',
                width: maxX - minX,
                height: maxY - minY,
                rotation: 0,
                backgroundColor: 'transparent',
                lineHeight: 1.3,
                letterSpacing: 0,
                opacity: 1,
                isScanning: true, // Start scanning
                autoFitEnabled: true // Enable for bubbles
            };

            setObjectsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), placeholderText]
            }));

            // Auto-select the new bubble for immediate editing
            setSelectedId(newTextId);

            skipAutoOpenRef.current = true;
            setSelectedId(newTextId);

            // --- SMART ACTION: OCR the bubble region ---
            const cropW = localX2 - localX1;
            const cropH = localY2 - localY1;

            // Extract Image Snippet for List View (Manual Translation Helper)
            try {
                const srcImg = images.find(i => i.id === imageId);
                if (srcImg) {
                    const tempImg = new window.Image();
                    tempImg.crossOrigin = "anonymous";
                    tempImg.src = srcImg.translatedUrl || srcImg.preview;

                    // Wait for image to load
                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = cropW * 2; // 2x resolution
                    canvas.height = cropH * 2;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(
                            tempImg,
                            localX1, localY1, cropW, cropH,
                            0, 0, canvas.width, canvas.height
                        );
                        const snippetUrl = canvas.toDataURL('image/jpeg', 0.95);
                        setImageSnippets(prev => ({ ...prev, [newTextId]: snippetUrl }));

                        // --- LOCAL OCR (Tesseract) IF SERVER AI IS OFF ---
                        // --- LOCAL OCR (Tesseract) IF SERVER AI IS OFF ---
                        // --- LOCAL OCR (Tesseract) IF SERVER AI IS ENABLED (Fallback) ---
                        if (isOCREnabled) {
                            const tId = toast.loading("MangaOCR: Уншиж байна...");

                            // Convert canvas directly to blob for upload
                            canvas.toBlob(async (blob) => {
                                if (!blob) {
                                    toast.error("OCR Failed: Image processing error", { id: tId });
                                    return;
                                }

                                try {
                                    const formData = new FormData();
                                    formData.append('image', blob);

                                    const response = await fetch(`${backendUrl}/ocr`, {
                                        method: 'POST',
                                        body: formData
                                    });

                                    if (!response.ok) throw new Error("Backend OCR failed");

                                    const data = await response.json();
                                    const text = data.text;

                                    if (!isMounted.current) return;

                                    if (!text || text.trim().length === 0) {
                                        toast.dismiss(tId);
                                    } else {
                                        toast.success("MangaOCR амжилттай!", { id: tId });
                                    }

                                    setObjectsMap(prev => ({
                                        ...prev,
                                        [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                                            o.id === newTextId ? { ...o, isScanning: false, originalText: text.trim(), text: text.trim() } : o
                                        )
                                    }));
                                } catch (err) {
                                    console.warn("Backend OCR failed, switching to local Tesseract...", err);
                                    toast.loading("Backend failed, trying local OCR...", { id: tId });

                                    try {
                                        // Fallback to Tesseract.js
                                        // Use 'eng' and 'chi_sim' (common in manga) or just 'eng' for now based on context. 
                                        // Ideally 'mon' if available, but 'eng' is safe default.
                                        const { data: { text } } = await Tesseract.recognize(
                                            blob,
                                            'eng',
                                            // { logger: m => console.log(m) } // Optional
                                        );

                                        if (!isMounted.current) return;

                                        if (!text || text.trim().length === 0) {
                                            toast.dismiss(tId);
                                        } else {
                                            toast.success("Local OCR амжилттай!", { id: tId });
                                        }

                                        setObjectsMap(prev => ({
                                            ...prev,
                                            [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                                                o.id === newTextId ? { ...o, isScanning: false, originalText: text.trim(), text: text.trim() } : o
                                            )
                                        }));

                                    } catch (tessErr) {
                                        console.error("Local OCR Error:", tessErr);
                                        const errMsg = tessErr instanceof Error ? tessErr.message : 'Unknown Error';
                                        toast.error(`OCR Failed: ${errMsg}`, { id: tId });

                                        setObjectsMap(prev => ({
                                            ...prev,
                                            [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                                                o.id === newTextId ? { ...o, isScanning: false, originalText: `Error: ${errMsg}` } : o
                                            )
                                        }));
                                    }
                                }
                            }, 'image/png');
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to extract snippet", e);
            }

            // --- SMART ACTION: OCR the bubble region ---
            if (!isOCREnabled) {
                // If OCR is disabled, stop scanning immediately and leave empty
                setObjectsMap(prev => ({
                    ...prev,
                    [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                        o.id === newTextId ? { ...o, isScanning: false, originalText: undefined } : o
                    )
                }));
                return;
                return;
            }

            return; // Server logic disabled for now (Using Local Tesseract)

            // Allow ui update first
            // Allow ui update first
            setTimeout(async () => {
                try {
                    if (cropW > 0 && cropH > 0) {
                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = cropW;
                        cropCanvas.height = cropH;
                        const cropCtx = cropCanvas.getContext('2d');
                        if (cropCtx) {
                            const cropData = new ImageData(cropW, cropH);
                            for (let y = 0; y < cropH; y++) {
                                for (let x = 0; x < cropW; x++) {
                                    const srcIdx = ((localY1 + y) * canvasW + (localX1 + x)) * 4;
                                    const destIdx = (y * cropW + x) * 4;
                                    cropData.data[destIdx] = data[srcIdx];
                                    cropData.data[destIdx + 1] = data[srcIdx + 1];
                                    cropData.data[destIdx + 2] = data[srcIdx + 2];
                                    cropData.data[destIdx + 3] = 255;
                                }
                            }
                            cropCtx.putImageData(cropData, 0, 0);
                            cropCanvas.toBlob(async (blob) => {
                                if (!blob) return;
                                const fd = new FormData();
                                fd.append('image', blob, 'crop.png');
                                try {
                                    if (!backendUrl) throw new Error("Backend URL missing");

                                    const ocrRes = await fetch(`${backendUrl}/ocr`, { method: 'POST', body: fd });
                                    if (ocrRes.ok) {
                                        const ocrData = await ocrRes.json();
                                        if (ocrData.text) {
                                            setObjectsMap(prev => {
                                                const chapterObjs = prev[activeChapterId] || [];
                                                return {
                                                    ...prev,
                                                    [activeChapterId]: chapterObjs.map(o =>
                                                        o.id === newTextId ? { ...o, originalText: ocrData.text, isScanning: false } : o
                                                    )
                                                };
                                            });
                                            // toast.success("Текст танигдлаа", { id: t });
                                        } else {
                                            // OCR completed but no text found
                                            setObjectsMap(prev => {
                                                const chapterObjs = prev[activeChapterId] || [];
                                                return {
                                                    ...prev,
                                                    [activeChapterId]: chapterObjs.map(o =>
                                                        o.id === newTextId ? { ...o, isScanning: false, originalText: "No text detected." } : o
                                                    )
                                                };
                                            });
                                        }
                                    } else {
                                        throw new Error("OCR server error");
                                    }
                                } catch (e) {
                                    console.warn("OCR failed (likely offline):", e);
                                    // toast.error("AI server unreachable", { id: t });
                                    // Stop scanning on error
                                    setObjectsMap(prev => {
                                        const chapterObjs = prev[activeChapterId] || [];
                                        return {
                                            ...prev,
                                            [activeChapterId]: chapterObjs.map(o =>
                                                o.id === newTextId ? { ...o, isScanning: false, originalText: "Error scanning." } : o
                                            )
                                        };
                                    });
                                }
                            }, 'image/png');
                        }
                    }
                } catch (timeoutErr) {
                    console.error("Magic Wand Async Error:", timeoutErr);
                }
            }, 0);


            // toast.success("Бөмбөлөг цэвэрлэгдэж, орчуулгын жагсаалтад нэмэгдлээ", { id: t });
            // Keep it active for continuous cleaning, like the text tool
        } catch (err) {
            console.error(err);
            toast.error("Алдаа гарлаа", { id: t });
        }
    };

    // --- DRAG AND DROP HANDLER FOR FONTS ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Check if files are fonts
        const fontFiles = files.filter(f =>
            f.name.toLowerCase().endsWith('.ttf') ||
            f.name.toLowerCase().endsWith('.otf') ||
            f.name.toLowerCase().endsWith('.woff') ||
            f.name.toLowerCase().endsWith('.woff2')
        );

        if (fontFiles.length > 0) {
            toast.loading("Фонт ачаалж байна...", { duration: 2000 });

            for (const file of fontFiles) {
                try {
                    // 1. Load into Browser (Immediate)
                    const arrayBuffer = await file.arrayBuffer();
                    // Remove extension for name
                    const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '-');
                    const fontFace = new FontFace(fontName, arrayBuffer);
                    await fontFace.load();
                    document.fonts.add(fontFace);

                    // 2. Upload to Cloudflare R2
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucketPath', 'fonts');
                    formData.append('raw', 'true'); // Fonts must be raw, not converted to webp

                    const result = await uploadImage(formData);

                    if (!result.success) throw new Error(result.error);

                    // 3. Get Public URL
                    const publicUrl = result.url;

                    // 4. Save to Database
                    const { error: dbError } = await supabase
                        .from('custom_fonts')
                        .insert({
                            name: fontName,
                            url: publicUrl,
                            user_id: (await supabase.auth.getUser()).data.user?.id
                        });

                    if (dbError) throw dbError;

                    // 5. Update State
                    const newFont = {
                        name: fontName,
                        value: `"${fontName}", sans-serif`,
                        family: fontName,
                        isCustom: true
                    };

                    setLocalFonts(prev => [newFont, ...prev]);
                    toast.success(`${fontName} амжилттай нэмэгдлээ!`);

                } catch (err: any) {
                    console.error("Font upload error:", err);
                    toast.error(`Фонт оруулахад алдаа гарлаа: ${err.message}`);
                }
            }
            return; // Stop if fonts were processed (don't try to import as images)
        }

        // Use existing logic for images if needed, but for now we just return if not font
        // If you have image drop logic here, append it.
    };

    // --- IMPORT FROM URL ---
    const handleUrlImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        const tId = toast.loading("Сайтаас зургуудыг хайж байна...");

        const controller = new AbortController();

        try {
            const res = await fetch('/api/scrape-chapter', {
                method: 'POST',
                body: JSON.stringify({ url: importUrl }),
                signal: controller.signal
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            if (!data.images || data.images.length === 0) throw new Error("Зураг олдсонгүй");

            toast.loading(`${data.images.length} зураг олдлоо. Татаж байна...`, { id: tId });

            const newImages: string[] = [];

            for (const url of data.images) {
                try {
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                    const imgRes = await fetch(proxyUrl, { signal: controller.signal });
                    if (!imgRes.ok) continue;

                    const blob = await imgRes.blob();

                    // Upload to storage
                    const file = new File([blob], `import-${Date.now()}.jpg`, { type: blob.type });
                    // Upload to storage
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucketPath', `chapters/${activeChapterId}`);

                    const result = await uploadImage(formData);

                    if (!result.success) throw new Error(result.error);

                    const publicUrl = result.url;

                    if (publicUrl) newImages.push(publicUrl);
                } catch (e) {
                    console.warn("Failed to import image:", url);
                }
            }

            if (newImages.length > 0) {
                // Get current chapter images
                const { data: chapterData } = await supabase.from('chapters').select('images').eq('id', activeChapterId).single();
                const currentImages = chapterData?.images || [];

                const { error: updateError } = await supabase
                    .from('chapters')
                    .update({ images: [...currentImages, ...newImages] })
                    .eq('id', activeChapterId);

                if (updateError) throw updateError;

                toast.success(`${newImages.length} зураг амжилттай нэмэгдлээ!`, { id: tId });
                window.location.reload();
            } else {
                toast.error("Зураг нэмэгдсэнгүй", { id: tId });
            }

            setImportUrl('');
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            toast.error("Алдаа: " + err.message, { id: tId });
        } finally {
            if (isMounted.current) setIsImporting(false);
        }
    };


    const handleCTPRImport = async (e: React.ChangeEvent<HTMLInputElement>, imageId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const tId = toast.loading("CTPR файл уншиж байна...");
        try {
            const result = await parseCTPR(file);

            // Map text objects
            // Map text objects
            const newTextObjects = result.textObjects.map(obj => ({
                // Basic Properties
                id: obj.id || Math.random().toString(36).substr(2, 9),
                imageId: imageId, // Override imageId to current page
                text: obj.text,
                originalText: obj.originalText || '',
                x: obj.x,
                y: obj.y + 7, // +7px manual offset requested by user
                width: obj.width,
                height: obj.height,

                // Styling Properties
                fontFamily: obj.fontFamily || 'Inter',
                fontSize: obj.fontSize || 20,
                color: obj.color || '#000000',
                fontWeight: obj.fontWeight || 'normal',
                fontStyle: obj.fontStyle || 'normal',
                textAlign: (obj.textAlign as any) || 'center',
                strokeWidth: obj.strokeWidth || 0,
                strokeColor: obj.strokeColor || '#000000',
                backgroundColor: obj.backgroundColor || 'transparent',
                lineHeight: obj.lineHeight || 1.2,
                letterSpacing: obj.letterSpacing || 0,
                opacity: obj.opacity ?? 1,
                rotation: obj.rotation || 0,

                // Editor State
                isScanning: false,
                autoFitEnabled: true
            }));

            // Map eraser/patch objects
            const newEraserObjects = result.eraserObjects.map(obj => ({
                ...obj,
                imageId, // Override imageId to current page
            }));

            setObjectsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), ...newTextObjects]
            }));

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), ...newEraserObjects]
            }));

            toast.success(`CTPR-аас ${newTextObjects.length} текст, ${newEraserObjects.length} засварыг амжилттай импортлолоо!`, { id: tId });
        } catch (err: any) {
            console.error("CTPR Import Error:", err);
            toast.error(`CTPR импортлоход алдаа гарлаа: ${err.message}`, { id: tId });
        } finally {
            if (ctprInputRef.current) ctprInputRef.current.value = '';
        }
    };


    // --- AI AUTO-CLEAN (BROWSERSIDE ONNX) ---
    const handleAutoCleanAI = async (imageId: string) => {
        const img = images.find(i => i.id === imageId);
        if (!img) return;

        setAIProgress({ active: true, message: 'AI Моделиудыг бэлдэж байна...', progress: 0 });

        try {
            // 1. Load Models (Cached/Preloaded) with Progress UI
            await bubbleDetector.current.loadModel((pct, msg) => {
                setAIProgress({ active: true, message: msg, progress: pct * 0.5 }); // First 50%
            });
            await imageCleaner.current.loadModel((pct, msg) => {
                setAIProgress({ active: true, message: msg, progress: 50 + pct * 0.5 }); // Second 50%
            });

            setAIProgress({ active: true, message: 'Зургийг шинжилж байна...', progress: 95 });

            // 2. Load Image to Canvas
            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.src = img.translatedUrl || img.preview;
            await new Promise((r) => { image.onload = r; });

            const w = image.naturalWidth;
            const h = image.naturalHeight;

            // 3. Detect Bubbles
            const boxes = await bubbleDetector.current.detect(image);

            if (boxes.length === 0) {
                toast.error("Текст олдсонгүй");
                setAIProgress({ active: false, message: '' });
                return;
            }

            setAIProgress({ active: true, message: `${boxes.length} текст олдлоо. Цэвэрлэж байна...` });

            // 4. Create Mask for Inpainting
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = w;
            maskCanvas.height = h;
            const mCtx = maskCanvas.getContext('2d')!;
            mCtx.fillStyle = 'black';
            mCtx.fillRect(0, 0, w, h);
            mCtx.fillStyle = 'white';

            boxes.forEach(box => {
                // Label 0 is usually text, 1 is bubble in this model
                // We want to erase both or just text? Usually erasing text is enough.
                const pad = 5;
                mCtx.fillRect(box.x1 - pad, box.y1 - pad, (box.x2 - box.x1) + pad * 2, (box.y2 - box.y1) + pad * 2);
            });

            // 5. Run Inpainting (LaMa)
            const cleanedDataUrl = await imageCleaner.current.clean(image, maskCanvas);

            // 6. Update Image & Add Text Objects
            saveHistory();

            // Convert Data URL to File for Supabase
            const response = await fetch(cleanedDataUrl);
            const blob = await response.blob();
            const file = new File([blob], `clean-${Date.now()}.png`, { type: 'image/png' });

            if (onUpdateImage) {
                onUpdateImage(activeChapterId, imageId, cleanedDataUrl, file);
            }

            // Add Text Objects
            const newObjects: TextObject[] = boxes.map(box => {
                const id = Math.random().toString(36).substr(2, 9);
                return {
                    id,
                    imageId,
                    text: '',
                    x: box.x1,
                    y: box.y1,
                    ...lastUsedStyle.current,
                    fontSize: Math.min((lastUsedStyle.current.fontSize || 16) * (w / 800), (box.y2 - box.y1) * 0.8),
                    textAlign: 'center',
                    fontStyle: 'normal',
                    width: box.x2 - box.x1,
                    height: box.y2 - box.y1,
                    rotation: 0,
                    backgroundColor: 'transparent',
                    lineHeight: 1.3,
                    letterSpacing: 0,
                    opacity: 1,
                    isScanning: false, // In browser mode, we might not have OCR yet or can run it separately
                    autoFitEnabled: true
                };
            });

            setObjectsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), ...newObjects]
            }));

            toast.success(`${boxes.length} бөмбөлгийг амжилттай цэвэрлэж, бэлдэц үүсгэлээ!`, { icon: '✨' });

        } catch (err) {
            console.error('AI Auto-Clean Error:', err);
            toast.error("AI ажиллахад алдаа гарлаа. Та интернэт эсвэл хөтөчөө шалгана уу.");
        } finally {
            setAIProgress({ active: false, message: '', progress: 0 });
        }
    };

    // --- VELOCITY FEATURE: Scan Page for All Bubbles ---
    const scanPageForBubbles = useCallback(async (imageId: string) => {
        const tId = toast.loading("Хуудсыг уншиж байна...");
        const img = images.find(i => i.id === imageId);
        if (!img) return;

        try {
            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.src = img.translatedUrl || img.preview;
            await new Promise((r) => { image.onload = r; });

            const w = image.naturalWidth;
            const h = image.naturalHeight;
            const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
            const displayScale = imgEl ? (w / imgEl.clientWidth) : (w / 800);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const visited = new Uint8Array(w * h);
            const foundBubbles: { x: number, y: number, w: number, h: number, count: number, touchesEdge: boolean, pathData: string }[] = [];

            // Parameters
            const step = 8; // Finer scan
            const threshold = 252; // Stricter whiteness (was 240) to avoid light grey art parts
            const minSize = 35;
            const PAD = 2; // Erosion padding

            // Helper for Flood Fill
            const floodFill = (startX: number, startY: number) => {
                let minX = startX, maxX = startX, minY = startY, maxY = startY;
                const stack = [[startX, startY]];
                let pixelCount = 0;
                let touchesEdge = false;
                const rowGroups: Record<number, number[]> = {};

                while (stack.length > 0) {
                    const [cx, cy] = stack.pop()!;
                    const idx = (cy * w + cx);

                    if (visited[idx]) continue;
                    visited[idx] = 1;
                    pixelCount++;

                    if (cx < minX) minX = cx;
                    if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy;
                    if (cy > maxY) maxY = cy;

                    if (!rowGroups[cy]) rowGroups[cy] = [];
                    rowGroups[cy].push(cx);

                    if (cx <= 5 || cx >= w - 6 || cy <= 5 || cy >= h - 6) {
                        touchesEdge = true;
                    }

                    // 4 Neighbors
                    const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const nIdx = (ny * w + nx);
                            if (!visited[nIdx]) {
                                const r = data[nIdx * 4];
                                const g = data[nIdx * 4 + 1];
                                const b = data[nIdx * 4 + 2];
                                const lum = (r + g + b) / 3;
                                if (lum > threshold) {
                                    stack.push([nx, ny]);
                                }
                            }
                        }
                    }
                }

                // Generate SVG Path for precise cleaning with Horizontal Erosion
                const rects: { x1: number, x2: number, y1: number, y2: number }[] = [];
                for (let y = minY; y <= maxY; y++) {
                    const row = (rowGroups[y] || []).sort((a, b) => a - b);
                    if (row.length === 0) continue;
                    let rStart = row[0];
                    for (let i = 1; i <= row.length; i++) {
                        if (i === row.length || row[i] !== row[i - 1] + 1) {
                            // Erode Horizontal
                            const x1 = rStart + PAD;
                            const x2 = row[i - 1] + 1 - PAD;
                            if (x2 > x1) {
                                rects.push({ x1, x2, y1: y, y2: y + 1 });
                            }
                            if (i < row.length) rStart = row[i];
                        }
                    }
                }
                const pathData = rects.map(r => `M ${r.x1} ${r.y1} h ${r.x2 - r.x1} v ${r.y2 - r.y1} h ${-(r.x2 - r.x1)} z`).join(' ');

                return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, count: pixelCount, touchesEdge, pathData };
            };

            // Scan Grid
            for (let y = step; y < h; y += step) {
                for (let x = step; x < w; x += step) {
                    const idx = (y * w + x);
                    if (visited[idx]) continue;

                    const r = data[idx * 4];
                    const g = data[idx * 4 + 1];
                    const b = data[idx * 4 + 2];
                    const lum = (r + g + b) / 3;

                    if (lum > threshold) {
                        const bubble = floodFill(x, y);
                        // Filter Logic
                        const aspect = bubble.w / (bubble.h || 1);
                        const fillRatio = bubble.count / (bubble.w * bubble.h);
                        const isReasonableAspect = aspect > 0.3 && aspect < 3.5;

                        if (!bubble.touchesEdge &&
                            bubble.w > minSize && bubble.h > minSize &&
                            fillRatio > 0.4 && // Bubbles are solid
                            isReasonableAspect
                        ) {
                            if (bubble.w < w * 0.8 && bubble.h < h * 0.5) {
                                foundBubbles.push(bubble);
                            }
                        }
                    }
                }
            }

            toast.loading(`Боловсруулж байна...`, { id: tId });

            const updates: Record<string, string> = {};
            const cleaningDrawings: EraserObject[] = [];

            // 1. Create objects & cleaning layers visually first
            const createdObjs = foundBubbles.map((b) => {
                const id = crypto.randomUUID();

                // --- BATCH AUTO-CLEAN ---
                cleaningDrawings.push({
                    id: crypto.randomUUID(),
                    imageId,
                    pathData: b.pathData,
                    strokeWidth: 0,
                    color: '#FFFFFF', // Clean with solid white
                    isFill: true
                });

                const snipCanvas = document.createElement('canvas');
                snipCanvas.width = b.w;
                snipCanvas.height = b.h;
                const snipCtx = snipCanvas.getContext('2d');
                if (snipCtx) {
                    snipCtx.drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);

                    // Pre-processing
                    const imgData = snipCtx.getImageData(0, 0, b.w, b.h);
                    const d = imgData.data;
                    for (let i = 0; i < d.length; i += 4) {
                        const v = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
                        const t = v > 200 ? 255 : (v < 100 ? 0 : v);
                        d[i] = d[i + 1] = d[i + 2] = t;
                    }
                    snipCtx.putImageData(imgData, 0, 0);

                    updates[id] = snipCanvas.toDataURL('image/jpeg', 0.95);
                }

                return {
                    id,
                    imageId: imageId,
                    x: b.x,
                    y: b.y,
                    text: '',
                    width: b.w,
                    height: b.h,
                    ...lastUsedStyle.current,
                    fontSize: Math.min((lastUsedStyle.current.fontSize || 16) * displayScale, Math.max(12, Math.round(b.w / 6))),
                    rotation: 0,
                    fontStyle: 'normal',
                    backgroundColor: 'transparent',
                    lineHeight: 1.1,
                    letterSpacing: 0,
                    opacity: 1,
                    isScanning: true,
                    originalText: undefined
                } as any;
            });

            if (createdObjs.length > 0) {
                saveHistory();

                // 1. Apply cleaning drawings
                setDrawingsMap(prev => ({
                    ...prev,
                    [activeChapterId]: [...(prev[activeChapterId] || []), ...cleaningDrawings]
                }));

                // 2. Add text objects
                setObjectsMap(prev => ({
                    ...prev,
                    [activeChapterId]: [...(prev[activeChapterId] || []), ...createdObjs]
                }));
                setImageSnippets(prev => ({ ...prev, ...updates }));

                // 3. Auto-focus first bubble
                setSelectedId(createdObjs[0].id);

                // 4. Parallel OCR (Concurrently process 3 snippets at a time)
                (async () => {
                    const CONCURRENCY = 3;
                    const queue = [...createdObjs];

                    const worker = async () => {
                        while (queue.length > 0) {
                            const obj = queue.shift();
                            if (!obj) continue;
                            try {
                                const snippetUrl = updates[obj.id];
                                if (!snippetUrl) continue;
                                const { data: { text } } = await Tesseract.recognize(snippetUrl, 'eng');

                                if (!isMounted.current) return;

                                let clean = text.replace(/[|_[\]{}\\\/]/g, '').replace(/\s+/g, ' ').trim();
                                if (clean.length < 2 && !['I', 'A', 'a', 'i', '?', '!'].includes(clean)) clean = "";

                                setObjectsMap(prev => ({
                                    ...prev,
                                    [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                                        o.id === obj.id ? { ...o, isScanning: false, originalText: clean || "..." } : o
                                    )
                                }));
                            } catch (err) {
                                console.error("Parallel OCR error", err);
                                setObjectsMap(prev => ({
                                    ...prev,
                                    [activeChapterId]: (prev[activeChapterId] || []).map(o =>
                                        o.id === obj.id ? { ...o, isScanning: false, originalText: "Error" } : o
                                    )
                                }));
                            }
                        }
                    };

                    await Promise.all(Array(CONCURRENCY).fill(null).map(() => worker()));
                    toast.success("Дууслаа!", { id: tId });
                })();
            } else {
                toast.dismiss(tId);
            }

        } catch (e) {
            console.error("Scan failed", e);
            toast.error("Scan failed", { id: tId });
        }
    }, [images, activeChapterId]);




    const addText = (imageId: string, x = 100, y = 100) => {
        saveHistory(); // Save before adding

        const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
        const naturalScale = imgEl ? (imgEl.naturalWidth / imgEl.clientWidth) : 1;

        const newTextId = Math.random().toString(36).substr(2, 9);
        const newText: TextObject = {
            id: newTextId,
            imageId,
            text: 'Шинэ текст...',
            x, // Coordinates passed in are now Natural (from onMouseDown)
            y,
            ...lastUsedStyle.current, // Inherit last used style
            fontFamily: defaultFont, // OVERRIDE with persisted default font
            // Scale font size if it's default (not from history)
            fontSize: lastUsedStyle.current.fontSize || (20 * naturalScale), // 30px natural base?
            // Actually, if we use natural coordinates, a fixed natural number (e.g. 40) is consistent.
            // But 40px might be tiny on 4k.
            // naturalScale tells us "how big IS the image relative to screen".
            // If naturalScale is 10 (huge image), we want font to be 10x bigger.
            // So 20 * naturalScale is a good default.

            fontStyle: 'normal',
            width: 200,
            rotation: 0,
            backgroundColor: 'transparent',
            lineHeight: 1.1,
            letterSpacing: 0,
            opacity: 1,
            autoFitEnabled: false // Disable for manual text
        };
        setObjectsMap(prev => ({
            ...prev,
            [activeChapterId]: [...(prev[activeChapterId] || []), newText]
        }));
        setSelectedId(newTextId);
        setIsTextToolActive(false); // Tool deactivated after placing one

        // PIXART: Immediate edit on mobile - DISABLED auto-open, user wants direct edit
        if (window.innerWidth < 768) {
            setEditingId(newTextId);
            setTimeout(() => {
                const el = document.getElementById(`canvas-input-${newTextId}`);
                el?.focus();
                if (el instanceof HTMLTextAreaElement) {
                    el.select();
                }
            }, 300);
        }
    };

    const updateObject = (id: string, updates: Partial<TextObject>) => {
        // VELOCITY: Capture style changes for persistence
        const styleKeys: (keyof typeof lastUsedStyle.current)[] = ['fontSize', 'fontFamily', 'color', 'fontWeight', 'strokeColor', 'strokeWidth', 'textAlign', 'gradientEnabled', 'color2', 'gradientAngle', 'lineHeight', 'letterSpacing'];
        styleKeys.forEach(key => {
            if (updates[key] !== undefined) {
                (lastUsedStyle.current as any)[key] = updates[key];
            }
        });

        setObjectsMap(prev => {
            const currentObj = prev[activeChapterId]?.find(o => o.id === id);
            if (!currentObj) return prev;

            let finalUpdates = { ...updates };

            // Real-time Auto-Fit Trigger (Text or Bubble resize)
            if (currentObj.autoFitEnabled && (updates.text !== undefined || updates.width !== undefined || updates.height !== undefined)) {
                const result = calculateAutoFit({ ...currentObj, ...updates });
                if (result) {
                    finalUpdates.fontSize = result.fontSize;
                    finalUpdates.text = result.text; // Optimized wrapping
                }
            }

            const list = prev[activeChapterId].map(o => o.id === id ? { ...o, ...finalUpdates } : o);
            return { ...prev, [activeChapterId]: list };
        });
    };

    const deleteObject = (id: string) => {
        saveHistory(); // Save before deleting

        // Find if the object to be deleted has a linkedId
        const obj = objects.find(o => o.id === id);
        const draw = drawings.find(d => d.id === id);
        const linkId = obj?.linkedId || draw?.linkedId;

        setObjectsMap(prev => ({
            ...prev,
            [activeChapterId]: (prev[activeChapterId] || []).filter(o => o.id !== id && (!linkId || o.linkedId !== linkId))
        }));
        setDrawingsMap(prev => ({
            ...prev,
            [activeChapterId]: (prev[activeChapterId] || []).filter(d => d.id !== id && (!linkId || d.linkedId !== linkId))
        }));
        if (selectedId === id) setSelectedId(null);
    };

    const handleDrawingStart = (imageId: string, x: number, y: number) => {
        if (!isEraserActive) return;
        setCurrentPath({ imageId, points: [{ x, y }] });
    };

    const handleDrawingMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isEraserActive || !currentPath) return;
        e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentPath.imageId}`) as HTMLImageElement;
        if (!imgEl) return;

        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        // Check bounds roughly (in natural coords)
        if (x < 0 || y < 0 || x > imgEl.naturalWidth || y > imgEl.naturalHeight) return;

        setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
    };
    const handleDrawingEnd = () => {
        if (!isEraserActive || !currentPath) return;

        saveHistory(); // Save before committing the new line

        // Save path
        // Convert points to natural coordinates
        const imgEl = document.getElementById(`img-el-${currentPath.imageId}`) as HTMLImageElement;
        const naturalScale = imgEl ? (imgEl.naturalWidth / imgEl.clientWidth) : 1;
        // Note: currentPath.points are in UNZOOMED DISPLAY coordinates (x, y)
        // We need to multiply by naturalScale to get NATURAL coordinates
        // Actually, let's verify how x,y were calculated: (clientX - rect.left) / viewport.scale
        // rect.width is DISPLAY width.
        // naturalScale = naturalWidth / rect.width
        // So naturalX = x * naturalScale

        const naturalPoints = currentPath.points.map(p => ({
            x: p.x * naturalScale,
            y: p.y * naturalScale
        }));

        const newEraserObj: EraserObject = {
            id: Math.random().toString(36).substr(2, 9),
            imageId: currentPath.imageId,
            points: naturalPoints,
            strokeWidth: eraserSize * naturalScale, // Also scale stroke width
            color: '#FFFFFF'
        };

        setDrawingsMap(prev => ({
            ...prev,
            [activeChapterId]: [...(prev[activeChapterId] || []), newEraserObj]
        }));
        setCurrentPath(null);
    };



    const handleRectStart = async (imageId: string, x: number, y: number) => {
        if (!isRectToolActive) return;

        // Sample color at starting point
        let sampledHex = '#FFFFFF';
        try {
            let cache = imageDataCache.current[imageId];
            if (!cache) {
                const image = new window.Image();
                image.crossOrigin = "anonymous";
                image.src = images.find(i => i.id === imageId)?.translatedUrl || images.find(i => i.id === imageId)?.preview || '';
                await new Promise((res, rej) => {
                    image.onload = res;
                    image.onerror = rej;
                });
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    cache = { data: imageData.data, w: canvas.width, h: canvas.height };
                    imageDataCache.current[imageId] = cache;
                }
            }

            if (cache) {
                const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
                if (imgEl) {
                    const rect = imgEl.getBoundingClientRect();
                    const pxX = Math.max(0, Math.min(cache.w - 1, Math.round(x)));
                    const pxY = Math.max(0, Math.min(cache.h - 1, Math.round(y)));
                    const baseIdx = (pxY * cache.w + pxX) * 4;
                    const r = cache.data[baseIdx];
                    const g = cache.data[baseIdx + 1];
                    const b = cache.data[baseIdx + 2];
                    sampledHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                }
            }
        } catch (e) {
            console.error("Sampling error", e);
        }

        setCurrentRect({ imageId, startX: x, startY: y, endX: x, endY: y, color: sampledHex });
    };

    const handleRectMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isRectToolActive || !currentRect) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentRect.imageId}`) as HTMLImageElement;
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        setCurrentRect(prev => prev ? { ...prev, endX: x, endY: y } : null);
    };



    const handleRectEnd = () => {
        if (!isRectToolActive || !currentRect) return;

        const { imageId, startX, startY, endX, endY, color } = currentRect;
        // Coords are already NATURAL
        const width = Math.abs(endX - startX);
        const hVal = Math.abs(endY - startY);

        if (width < 5 || hVal < 5) {
            setCurrentRect(null);
            return;
        }

        saveHistory();

        let rectType: 'solid' | 'gradient' = 'solid';
        let color1 = color || '#FFFFFF';
        let color2 = color || '#FFFFFF';

        // Auto-Gradient removed based on user request (Always solid)
        // try { ... } catch (e) { ... }

        const pathData = `M ${Math.min(currentRect.startX, currentRect.endX)} ${Math.min(currentRect.startY, currentRect.endY)} h ${Math.abs(currentRect.endX - currentRect.startX)} v ${Math.abs(currentRect.endY - currentRect.startY)} h ${-Math.abs(currentRect.endX - currentRect.startX)} z`;

        const commonGroupId = Math.random().toString(36).substr(2, 9);

        const newDrawing: EraserObject = {
            id: Math.random().toString(36).substr(2, 9),
            imageId,
            pathData,
            type: rectType,
            x1: (currentRect.startX + currentRect.endX) / 2,
            y1: Math.min(currentRect.startY, currentRect.endY),
            x2: (currentRect.startX + currentRect.endX) / 2,
            y2: Math.max(currentRect.startY, currentRect.endY),
            strokeWidth: 0,
            color: color1,
            color2: color2,
            isFill: true,
            linkedId: commonGroupId
        };

        setDrawingsMap(prev => ({
            ...prev,
            [activeChapterId]: [...(prev[activeChapterId] || []), newDrawing]
        }));




        // Automatically add text in the center - Only if not in cleaner mode AND rect is reasonable size
        if (mode !== 'cleaner' && width > 20) {
            const nX = Math.min(currentRect.startX, currentRect.endX);
            const nY = Math.min(currentRect.startY, currentRect.endY);
            const nW = Math.abs(currentRect.endX - currentRect.startX);
            const nH = Math.abs(currentRect.endY - currentRect.startY);

            const newTextId = Math.random().toString(36).substr(2, 9);
            const newText: TextObject = {
                id: newTextId,
                imageId,
                text: '',
                x: nX,
                y: nY,
                ...lastUsedStyle.current,
                fontSize: Math.min(lastUsedStyle.current.fontSize || 16, nH * 0.8),
                textAlign: 'center',
                fontStyle: 'normal',
                width: nW,
                height: Math.max(nH, lastUsedStyle.current.fontSize || 16),
                rotation: 0,
                backgroundColor: 'transparent',
                lineHeight: 1.3,
                letterSpacing: 0,
                opacity: 1,
                linkedId: commonGroupId
            };

            setObjectsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), newText]
            }));

            setSelectedId(newTextId);
        } else {
            setSelectedId(null);
        }
        setCurrentRect(null);
    };

    const handleGradientStart = async (imageId: string, x: number, y: number) => {
        if (!isGradientActive) return;

        // Sample initial color
        let sampledHex = '#FFFFFF';
        try {
            let cache = imageDataCache.current[imageId];
            if (!cache) {
                const image = new window.Image();
                image.crossOrigin = "anonymous";
                image.src = images.find(i => i.id === imageId)?.translatedUrl || images.find(i => i.id === imageId)?.preview || '';
                await new Promise((res, rej) => {
                    image.onload = res;
                    image.onerror = rej;
                });
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    cache = { data: imageData.data, w: canvas.width, h: canvas.height };
                    imageDataCache.current[imageId] = cache;
                }
            }

            if (cache) {
                const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
                if (imgEl) {
                    const rect = imgEl.getBoundingClientRect();
                    const scale = cache.w / (rect.width / zoom);
                    const pxX = Math.min(cache.w - 1, Math.max(0, Math.round(x * scale)));
                    const pxY = Math.min(cache.h - 1, Math.max(0, Math.round(y * scale)));

                    // Sample 3x3 neighborhood for robustness
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = Math.min(cache.w - 1, Math.max(0, pxX + dx));
                            const ny = Math.min(cache.h - 1, Math.max(0, pxY + dy));
                            const idx = (ny * cache.w + nx) * 4;
                            r += cache.data[idx];
                            g += cache.data[idx + 1];
                            b += cache.data[idx + 2];
                            count++;
                        }
                    }
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    sampledHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                }
            }
        } catch (e) {
            console.error("Gradient sampling error", e);
        }

        setCurrentGradient({ imageId, x1: x, y1: y, x2: x, y2: y, color1: sampledHex, color2: sampledHex });
    };

    const handleGradientMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isGradientActive || !currentGradient) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentGradient.imageId}`) as HTMLImageElement;
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        // Sample second color continuously
        let sampledHex2 = currentGradient.color2;
        try {
            let cache = imageDataCache.current[currentGradient.imageId];
            if (cache) {
                // cache.w should equal naturalWidth approx.
                // If we have x,y in Natural Coords, we can map directly to cache?
                // cache w/h is usually natural size.
                // Safety check scale:
                const scale = cache.w / imgEl.naturalWidth; // Should be 1
                const pxX = Math.min(cache.w - 1, Math.max(0, Math.round(x * scale)));
                const pxY = Math.min(cache.h - 1, Math.max(0, Math.round(y * scale)));

                // Sample 3x3 neighborhood
                let r = 0, g = 0, b = 0, count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = Math.min(cache.w - 1, Math.max(0, pxX + dx));
                        const ny = Math.min(cache.h - 1, Math.max(0, pxY + dy));
                        const idx = (ny * cache.w + nx) * 4;
                        r += cache.data[idx];
                        g += cache.data[idx + 1];
                        b += cache.data[idx + 2];
                        count++;
                    }
                }
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                sampledHex2 = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            }
        } catch (e) { }

        setCurrentGradient(prev => prev ? { ...prev, x2: x, y2: y, color2: sampledHex2 } : null);
    };

    const handleGradientEnd = () => {
        if (!isGradientActive || !currentGradient) return;

        const { imageId, x1, y1, x2, y2, color1, color2 } = currentGradient;
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        if (dist < 10) {
            setCurrentGradient(null);
            return;
        }

        saveHistory();

        // Coords are already NATURAL
        const gx1 = currentGradient.x1;
        const gy1 = currentGradient.y1;
        const gx2 = currentGradient.x2;
        const gy2 = currentGradient.y2;

        // Remove 'naturalScale' conversion logic as input is already Natural

        const newDrawing: EraserObject = {
            id: Math.random().toString(36).substr(2, 9),
            imageId: currentGradient.imageId,
            type: 'gradient',
            x1: gx1, // Natural
            y1: gy1,
            x2: gx2,
            y2: gy2,
            color: currentGradient.color1,
            color2: currentGradient.color2,
            strokeWidth: 0,
            isFill: true
        };

        setDrawingsMap(prev => ({
            ...prev,
            [activeChapterId]: [...(prev[activeChapterId] || []), newDrawing]
        }));

        setCurrentGradient(null);
    };

    const handleBlendStart = (imageId: string, x: number, y: number) => {
        if (!isBlendActive) return;
        setCurrentBlendPath({ imageId, points: [{ x, y }] });
    };

    const handleBlendMove = async (e: React.MouseEvent | React.TouchEvent) => {
        if (!isBlendActive || !currentBlendPath) return;
        e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentBlendPath.imageId}`) as HTMLImageElement;
        if (!imgEl) return;

        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        // Check bounds (Natural)
        if (x < 0 || y < 0 || x > imgEl.naturalWidth || y > imgEl.naturalHeight) return;

        setCurrentBlendPath(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
    };

    const handleBlendEnd = async () => {
        if (!isBlendActive || !currentBlendPath || currentBlendPath.points.length === 0) {
            setCurrentBlendPath(null);
            return;
        }

        saveHistory();

        const imgEl = document.getElementById(`img-el-${currentBlendPath.imageId}`) as HTMLImageElement;
        if (!imgEl) {
            setCurrentBlendPath(null);
            return;
        }

        const naturalWidth = imgEl.naturalWidth;
        const naturalHeight = imgEl.naturalHeight;

        // Calculate bounding box in natural pixels
        const pts = currentBlendPath.points;
        let minX = pts[0].x;
        let minY = pts[0].y;
        let maxX = pts[0].x;
        let maxY = pts[0].y;

        pts.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        const padding = blendSize;
        const targetX1 = Math.max(0, Math.floor(minX - padding));
        const targetY1 = Math.max(0, Math.floor(minY - padding));
        const targetX2 = Math.min(naturalWidth, Math.ceil(maxX + padding));
        const targetY2 = Math.min(naturalHeight, Math.ceil(maxY + padding));
        const w = targetX2 - targetX1;
        const h = targetY2 - targetY1;

        if (w <= 0 || h <= 0) {
            setCurrentBlendPath(null);
            return;
        }

        try {
            // Use a temporary canvas for the blend area
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("Canvas context failed");

            // Draw the region of the image into the canvas
            ctx.drawImage(imgEl, targetX1, targetY1, w, h, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const radius = blendSize / 2;
            const strength = blendStrength;

            // Apply blend effect to the small canvas
            pts.forEach(point => {
                const centerX = Math.round(point.x - targetX1);
                const centerY = Math.round(point.y - targetY1);

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > radius) continue;

                        const px = centerX + dx;
                        const py = centerY + dy;

                        if (px < 0 || px >= w || py < 0 || py >= h) continue;

                        // Sample neighborhood
                        let r = 0, g = 0, b = 0, count = 0;
                        const sampleRadius = 3;
                        for (let sy = -sampleRadius; sy <= sampleRadius; sy++) {
                            for (let sx = -sampleRadius; sx <= sampleRadius; sx++) {
                                const nx = Math.min(w - 1, Math.max(0, px + sx));
                                const ny = Math.min(h - 1, Math.max(0, py + sy));
                                const idx = (ny * w + nx) * 4;
                                r += data[idx];
                                g += data[idx + 1];
                                b += data[idx + 2];
                                count++;
                            }
                        }
                        r = Math.round(r / count);
                        g = Math.round(g / count);
                        b = Math.round(b / count);

                        const falloff = 1 - (dist / radius);
                        const effectiveStrength = strength * falloff;
                        const idx = (py * w + px) * 4;
                        data[idx] = Math.round(data[idx] * (1 - effectiveStrength) + r * effectiveStrength);
                        data[idx + 1] = Math.round(data[idx + 1] * (1 - effectiveStrength) + g * effectiveStrength);
                        data[idx + 2] = Math.round(data[idx + 2] * (1 - effectiveStrength) + b * effectiveStrength);
                    }
                }
            });

            ctx.putImageData(imageData, 0, 0);
            const resultImage = canvas.toDataURL('image/png');

            const newBlendStroke: EraserObject = {
                id: Math.random().toString(36).substr(2, 9),
                imageId: currentBlendPath.imageId,
                type: 'blend',
                points: pts,
                x1: targetX1,
                y1: targetY1,
                x2: targetX2,
                y2: targetY2,
                strokeWidth: blendSize,
                color: '#000000',
                blendSize: blendSize,
                blendStrength: blendStrength,
                resultImage
            };

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), newBlendStroke]
            }));
        } catch (e) {
            console.error("Blend preview error", e);
        }

        setCurrentBlendPath(null);
    };

    const handleCropStart = (imageId: string, x: number, y: number) => {
        if (!isCropActive) return;
        setCurrentCrop({ imageId, startX: x, startY: y, endX: x, endY: y });
    };

    const handleCropMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropActive || !currentCrop) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentCrop.imageId}`);
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) / viewport.scale;
        const y = (clientY - rect.top) / viewport.scale;

        setCurrentCrop(prev => prev ? { ...prev, endX: x, endY: y } : null);
    };

    const handleCropEnd = async () => {
        if (!isCropActive || !currentCrop) return;

        const { imageId, startX, startY, endX, endY } = currentCrop;
        const x1 = Math.min(startX, endX);
        const y1 = Math.min(startY, endY);
        const widthVal = Math.abs(endX - startX);
        const heightVal = Math.abs(endY - startY);

        if (widthVal < 20 || heightVal < 20) {
            setCurrentCrop(null);
            return;
        }

        const t = toast.loading("Crop хийж байна...");
        saveHistory();
        try {
            const img = images.find(i => i.id === imageId);
            if (!img) throw new Error("Image not found");

            const imgElement = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
            const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;

            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.src = img.translatedUrl || img.preview;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = widthVal * naturalScale;
            canvas.height = heightVal * naturalScale;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(
                image,
                x1 * naturalScale, y1 * naturalScale, widthVal * naturalScale, heightVal * naturalScale,
                0, 0, widthVal * naturalScale, heightVal * naturalScale
            );

            canvas.toBlob(async (blob) => {
                if (!blob || !onUpdateImage) return;
                const file = new File([blob], `crop-${imageId}-${Date.now()}.png`, { type: 'image/png' });
                const croppedUrl = URL.createObjectURL(blob);
                onUpdateImage(activeChapterId, imageId, croppedUrl, file);
            }, 'image/png');

            // Update objects anchored to this image (Natural pixels)
            const dx = x1 * naturalScale;
            const dy = y1 * naturalScale;

            setObjectsMap(prev => ({
                ...prev,
                [activeChapterId]: (prev[activeChapterId] || []).map(obj => {
                    if (obj.imageId === imageId) {
                        return {
                            ...obj,
                            x: obj.x - dx,
                            y: obj.y - dy
                        };
                    }
                    return obj;
                })
            }));

            // Update drawings (Natural pixels for everything except maybe pathData which is display-ish but we keep it natural)
            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: (prev[activeChapterId] || []).map(d => {
                    if (d.imageId === imageId) {
                        const updated = { ...d };
                        if (updated.points) {
                            updated.points = updated.points.map(p => ({ x: p.x - x1, y: p.y - y1 }));
                        }
                        if (updated.x1 !== undefined) updated.x1 -= x1;
                        if (updated.y1 !== undefined) updated.y1 -= y1;
                        if (updated.x2 !== undefined) updated.x2 -= x1;
                        if (updated.y2 !== undefined) updated.y2 -= y1;

                        // For pathData, we can't easily parse it, but we can wrap it in a translate if we change rendering.
                        // Or, simpler: regex replace for "M x y" and similar common starts
                        if (updated.pathData) {
                            // Simple offset for common Magic Wand path format (M x y h w v h z)
                            updated.pathData = updated.pathData.replace(/([ML])\s+([\d.-]+)\s+([\d.-]+)/g, (_, cmd, x, y) =>
                                `${cmd} ${parseFloat(x) - x1} ${parseFloat(y) - y1}`
                            ).replace(/M\s+([\d.-]+)\s+([\d.-]+)/g, (_, x, y) =>
                                `M ${parseFloat(x) - x1} ${parseFloat(y) - y1}`
                            );
                        }
                        return updated;
                    }
                    return d;
                })
            }));

            toast.success("Амжилттай таслагдлаа", { id: t });
            setIsCropActive(false);
        } catch (err) {
            console.error(err);
            toast.error("Алдаа гарлаа", { id: t });
        } finally {
            setCurrentCrop(null);
        }
    };

    const handlePatchStart = (imageId: string, x: number, y: number) => {
        if (!isPatchActive) return;
        setCurrentPatch({ imageId, x1: x, y1: y, x2: x, y2: y, sx: 0, sy: 0 });
    };

    const handlePatchMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPatchActive || !currentPatch) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentPatch.imageId}`) as HTMLImageElement;
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        setCurrentPatch(prev => prev ? { ...prev, x2: x, y2: y } : null);
    };

    const handlePatchEnd = async () => {
        if (!isPatchActive || !currentPatch) return;

        const { imageId, x1, y1, x2, y2 } = currentPatch;
        const w = Math.round(Math.abs(x2 - x1));
        const h = Math.round(Math.abs(y2 - y1));

        if (w < 5 || h < 5) {
            setCurrentPatch(null);
            return;
        }

        const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
        if (!imgEl) {
            setCurrentPatch(null);
            return;
        }

        try {
            saveHistory();

            const targetX = Math.round(Math.min(x1, x2));
            const targetY = Math.round(Math.min(y1, y2));
            const sx = 50; // Default sample offset
            const sy = 0;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            // Draw the sampled area into the target area
            ctx.drawImage(imgEl, targetX + sx, targetY + sy, w, h, 0, 0, w, h);
            const resultImage = canvas.toDataURL('image/png');

            const newPatch: EraserObject = {
                id: Math.random().toString(36).substr(2, 9),
                imageId,
                type: 'patch',
                x1: targetX,
                y1: targetY,
                x2: targetX + w,
                y2: targetY + h,
                sx,
                sy,
                strokeWidth: 0,
                color: '#000000',
                isFill: true,
                resultImage
            };

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), newPatch]
            }));

            toast.success("Patch applied! You can move it in layers.");
        } catch (e) {
            console.error("Patch error", e);
        }

        setCurrentPatch(null);
    };

    const handleInpaintStart = (imageId: string, x: number, y: number) => {
        if (!isInpaintActive) return;
        setCurrentInpaint({ imageId, x1: x, y1: y, x2: x, y2: y });
    };

    const handleInpaintMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isInpaintActive || !currentInpaint) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentInpaint.imageId}`) as HTMLImageElement;
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        setCurrentInpaint(prev => prev ? { ...prev, x2: x, y2: y } : null);
    };

    const handleInpaintEnd = async () => {
        if (!isInpaintActive || !currentInpaint) return;

        const { imageId, x1, y1, x2, y2 } = currentInpaint;
        const w = Math.round(Math.abs(x2 - x1));
        const h = Math.round(Math.abs(y2 - y1));

        // Always cleanup on end
        const cleanup = () => setCurrentInpaint(null);

        if (w < 5 || h < 5) {
            cleanup();
            return;
        }

        const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
        if (!imgEl) {
            cleanup();
            return;
        }

        try {
            saveHistory();

            // Ensure cache for sampling
            if (!imageDataCache.current[imageId]) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgEl.naturalWidth;
                tempCanvas.height = imgEl.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.drawImage(imgEl, 0, 0);
                    imageDataCache.current[imageId] = {
                        data: tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data,
                        w: tempCanvas.width,
                        h: tempCanvas.height
                    };
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            ctx.drawImage(imgEl, 0, 0);

            const targetX = Math.round(Math.min(x1, x2));
            const targetY = Math.round(Math.min(y1, y2));

            // Advanced Algorithm: Poisson-like Iterative Smoothing
            const imgData = ctx.getImageData(targetX, targetY, w, h);
            const data = imgData.data;

            // Boundary sampling
            const bTop = ctx.getImageData(targetX, Math.max(0, targetY - 1), w, 1).data;
            const bBottom = ctx.getImageData(targetX, Math.min(canvas.height - 1, targetY + h), w, 1).data;
            const bLeft = ctx.getImageData(Math.max(0, targetX - 1), targetY, 1, h).data;
            const bRight = ctx.getImageData(Math.min(canvas.width - 1, targetX + w), targetY, 1, h).data;

            // 1. Initial guess using distance weighting (to speed up convergence)
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    const idx = (j * w + i) * 4;
                    const wT = 1 / (j + 1);
                    const wB = 1 / (h - j);
                    const wL = 1 / (i + 1);
                    const wR = 1 / (w - i);
                    const sum = wT + wB + wL + wR;
                    for (let k = 0; k < 3; k++) {
                        data[idx + k] = (bTop[i * 4 + k] * wT + bBottom[i * 4 + k] * wB + bLeft[j * 4 + k] * wL + bRight[j * 4 + k] * wR) / sum;
                    }
                    data[idx + 3] = 255;
                }
            }

            // 2. Iterative Relaxation (Smoothing)
            const iterations = 60; // Enough for high-quality smoothing without too much lag
            let currentData = new Uint8ClampedArray(data);
            let nextData = new Uint8ClampedArray(data);

            for (let iter = 0; iter < iterations; iter++) {
                for (let j = 0; j < h; j++) {
                    for (let i = 0; i < w; i++) {
                        const idx = (j * w + i) * 4;
                        for (let k = 0; k < 3; k++) {
                            let sum = 0;
                            let count = 0;

                            // Neighbors (using boundaries for edges)
                            if (i > 0) { sum += currentData[idx - 4 + k]; count++; }
                            else { sum += bLeft[j * 4 + k]; count++; }

                            if (i < w - 1) { sum += currentData[idx + 4 + k]; count++; }
                            else { sum += bRight[j * 4 + k]; count++; }

                            if (j > 0) { sum += currentData[idx - w * 4 + k]; count++; }
                            else { sum += bTop[i * 4 + k]; count++; }

                            if (j < h - 1) { sum += currentData[idx + w * 4 + k]; count++; }
                            else { sum += bBottom[i * 4 + k]; count++; }

                            nextData[idx + k] = sum / count;
                        }
                    }
                }
                // Swap pointers for next iteration
                const temp = currentData;
                currentData = nextData;
                nextData = temp;
            }
            // Copy final result back to original image data
            data.set(currentData);

            const patchCanvas = document.createElement('canvas');
            patchCanvas.width = w;
            patchCanvas.height = h;
            const pCtx = patchCanvas.getContext('2d');
            pCtx?.putImageData(imgData, 0, 0);
            const resultImage = patchCanvas.toDataURL('image/png');

            const newInpaint: EraserObject = {
                id: Math.random().toString(36).substr(2, 9),
                imageId,
                type: 'inpaint',
                x1: targetX,
                y1: targetY,
                x2: targetX + w,
                y2: targetY + h,
                strokeWidth: 0,
                color: '#000000',
                isFill: true,
                resultImage
            };

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), newInpaint]
            }));

            toast.success("Smart Inpaint applied ✨");
        } catch (error) {
            console.error("Inpaint error:", error);
            toast.error("Smart Inpaint failed. Image might be too large or cross-origin.");
        } finally {
            cleanup();
        }
    };

    const handleContextAwareStart = (imageId: string, x: number, y: number) => {
        if (!isContextAwareActive) return;
        setCurrentContextAware({ imageId, x1: x, y1: y, x2: x, y2: y });
    };

    const handleContextAwareMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isContextAwareActive || !currentContextAware) return;
        if (e.cancelable) e.preventDefault();

        const imgEl = document.getElementById(`img-el-${currentContextAware.imageId}`) as HTMLImageElement;
        if (!imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const naturalScale = imgEl.naturalWidth / rect.width;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * naturalScale;
        const y = (clientY - rect.top) * naturalScale;

        setCurrentContextAware(prev => prev ? { ...prev, x2: x, y2: y } : null);
    };

    const handleContextAwareEnd = async () => {
        if (!isContextAwareActive || !currentContextAware) return;

        const { imageId, x1, y1, x2, y2 } = currentContextAware;
        const w = Math.round(Math.abs(x2 - x1));
        const h = Math.round(Math.abs(y2 - y1));

        const cleanup = () => setCurrentContextAware(null);

        if (w < 10 || h < 10) {
            cleanup();
            return;
        }

        const imgEl = document.getElementById(`img-el-${imageId}`) as HTMLImageElement;
        if (!imgEl) {
            cleanup();
            return;
        }

        try {
            saveHistory();
            toast.loading("AI Content-Aware Fill processing...", { id: 'context-aware-fill' });

            const targetX = Math.round(Math.min(x1, x2));
            const targetY = Math.round(Math.min(y1, y2));

            // --- OPTIMIZATION: Padded Crop ---
            const padding = 512;
            const cropX = Math.max(0, targetX - padding);
            const cropY = Math.max(0, targetY - padding);
            const cropW = Math.min(imgEl.naturalWidth - cropX, w + padding * 2);
            const cropH = Math.min(imgEl.naturalHeight - cropY, h + padding * 2);

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropW;
            cropCanvas.height = cropH;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) throw new Error("Crop canvas context failed");
            cropCtx.drawImage(imgEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            const blob = await new Promise<Blob | null>(res => cropCanvas.toBlob(res, 'image/png'));
            if (!blob) throw new Error("Blob creation failed");

            // Relative mask coordinates
            const relX = targetX - cropX;
            const relY = targetY - cropY;

            const formData = new FormData();
            formData.append('image', blob);
            formData.append('task_type', 'context_aware_fill');
            formData.append('mask_rect', JSON.stringify({ x: relX, y: relY, w, h }));

            const response = await fetch(`${backendUrl}/`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("AI Backend returned error");

            const resultBlob = await response.blob();
            const resultUrl = URL.createObjectURL(resultBlob);

            // Create a new EraserObject with the result image
            // Note: The backend returns the WHOLE image filled, or just the patch?
            // Usually simpler to return the whole image if we use manga-translator.

            // If the backend returns the WHOLE image, we should probably crop the region we care about 
            // OR update the whole image in baseImagesRef.

            // For now, let's assume it returns a PATCH of the same size.
            // Wait, I need to check how I'll implement the backend.

            const newDrawing: EraserObject = {
                id: Math.random().toString(36).substr(2, 9),
                imageId,
                type: 'inpaint',
                x1: cropX,
                y1: cropY,
                x2: cropX + cropW,
                y2: cropY + cropH,
                strokeWidth: 0,
                color: '#000000',
                isFill: true,
                resultImage: resultUrl
            };

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), newDrawing]
            }));

            toast.success("Content-Aware Fill applied ✨", { id: 'context-aware-fill' });
        } catch (error) {
            console.error("Context Aware Fill error:", error);
            toast.error("AI Processing failed. Check backend connection.", { id: 'context-aware-fill' });
        } finally {
            cleanup();
        }
    };

    const handleDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        if (isEraserActive || isTextToolActive) return; // Disable drag if eraser or text tool is active

        saveHistory(); // Save state before starting drag

        const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (window.innerWidth < 768) {
            setEditingId(null); // Reset edit mode on drag
        }

        // Find in objects OR drawings
        const targetObj = objects.find(o => o.id === id);
        const targetDrawing = drawings.find(d => d.id === id);

        if (!targetObj && !targetDrawing) return;

        const linkId = targetObj?.linkedId || targetDrawing?.linkedId;
        const initialLinkedObjects = linkId ? objects.filter(o => o.linkedId === linkId).map(o => ({ id: o.id, x: o.x, y: o.y })) : [];
        const initialLinkedDrawings = linkId ? drawings.filter(d => d.linkedId === linkId).map(d => ({
            id: d.id,
            x1: d.x1,
            y1: d.y1,
            x2: d.x2,
            y2: d.y2,
            pathData: d.pathData,
            points: d.points ? [...d.points] : undefined,
            sx: d.sx,
            sy: d.sy
        })) : [];

        const initialX = targetObj ? targetObj.x : (targetDrawing?.sx || 0);
        const initialY = targetObj ? targetObj.y : (targetDrawing?.sy || 0);

        const shiftPathData = (path: string, dx: number, dy: number) => {
            // Rect Tool Format: M x y h w v h z
            // We only need to shift the initial M x y
            return path.replace(/^M\s+([\d.-]+)\s+([\d.-]+)/, (_, x, y) => {
                const nx = parseFloat(x) + dx;
                const ny = parseFloat(y) + dy;
                return `M ${nx} ${ny}`;
            });
        };

        const move = (moveEvent: MouseEvent | TouchEvent) => {
            if ('touches' in moveEvent && moveEvent.cancelable) {
                moveEvent.preventDefault(); // Stop scrolling while dragging
            }
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const dx = (currentX - startX) / viewport.scale;
            const dy = (currentY - startY) / viewport.scale;

            const imgId = targetObj ? targetObj.imageId : targetDrawing!.imageId;
            const imgElement = document.getElementById(`img-el-${imgId}`) as HTMLImageElement;
            const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;

            const finalDx = dx * naturalScale;
            const finalDy = dy * naturalScale;

            if (linkId) {
                // Linked Movement: Move both text and background using captured initial positions
                setObjectsMap(prev => ({
                    ...prev,
                    [activeChapterId]: (prev[activeChapterId] || []).map(o => {
                        const init = initialLinkedObjects.find(i => i.id === o.id);
                        if (init) return { ...o, x: init.x + finalDx, y: init.y + finalDy };
                        return o;
                    })
                }));
                setDrawingsMap(prev => ({
                    ...prev,
                    [activeChapterId]: (prev[activeChapterId] || []).map(d => {
                        const init = initialLinkedDrawings.find(i => i.id === d.id);
                        if (init) {
                            const nx1 = (init.x1 || 0) + finalDx;
                            const ny1 = (init.y1 || 0) + finalDy;
                            const nx2 = (init.x2 || 0) + finalDx;
                            const ny2 = (init.y2 || 0) + finalDy;

                            const nPath = init.pathData ? shiftPathData(init.pathData, finalDx, finalDy) : undefined;
                            const nPoints = init.points ? init.points.map(p => ({ x: p.x + finalDx, y: p.y + finalDy })) : undefined;
                            const nsx = init.sx !== undefined ? init.sx + finalDx : undefined;
                            const nsy = init.sy !== undefined ? init.sy + finalDy : undefined;

                            return { ...d, x1: nx1, y1: ny1, x2: nx2, y2: ny2, pathData: nPath, points: nPoints, sx: nsx, sy: nsy };
                        }
                        return d;
                    })
                }));
            } else if (targetObj) {
                updateObject(id, { x: initialX + finalDx, y: initialY + finalDy });
            } else if (targetDrawing && targetDrawing.type === 'patch') {
                setDrawingsMap(prev => ({
                    ...prev,
                    [activeChapterId]: (prev[activeChapterId] || []).map(d =>
                        d.id === id ? { ...d, sx: initialX + finalDx, sy: initialY + finalDy } : d
                    )
                }));
            }
        };

        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);

            // Regenerate resultImage for patch AFTER drag ends
            if (targetDrawing && targetDrawing.type === 'patch') {
                const latestDrawings = drawingsRef.current[activeChapterId] || [];
                const updatedDrawing = latestDrawings.find(d => d.id === id);
                if (updatedDrawing) {
                    const { x1, x2, y1, y2, sx, sy } = updatedDrawing;
                    if (x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined && sx !== undefined && sy !== undefined) {
                        const imgEl = document.getElementById(`img-el-${updatedDrawing.imageId}`) as HTMLImageElement;
                        if (imgEl) {
                            const canvas = document.createElement('canvas');
                            const w = Math.round(x2 - x1);
                            const h = Math.round(y2 - y1);
                            if (w > 0 && h > 0) {
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.drawImage(imgEl, x1 + sx, y1 + sy, w, h, 0, 0, w, h);
                                    const resultImage = canvas.toDataURL('image/png');
                                    setDrawingsMap(prev => ({
                                        ...prev,
                                        [activeChapterId]: (prev[activeChapterId] || []).map(d =>
                                            d.id === id ? { ...d, resultImage } : d
                                        )
                                    }));
                                }
                            }
                        }
                    }
                }
            }
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
    };

    const handleResize = (id: string, side: 'right' | 'left' | 'bottom-right', e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        saveHistory();
        const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const target = objects.find(o => o.id === id);
        if (!target) return;

        const initialWidth = target.width;
        const initialFontSize = target.fontSize;
        const initialX = target.x;
        const initialY = target.y;

        const move = (moveEvent: MouseEvent | TouchEvent) => {
            if ('touches' in moveEvent && moveEvent.cancelable) {
                moveEvent.preventDefault();
            }
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const dx = (currentX - startX) / viewport.scale;
            const dy = (currentY - startY) / viewport.scale;

            const imgElement = document.getElementById(`img-el-${target.imageId}`) as HTMLImageElement;
            const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;

            let newWidth = initialWidth;
            let newFontSize = initialFontSize;
            let newX = initialX;

            if (side === 'right') {
                newWidth = Math.max(20, initialWidth + dx * naturalScale);
            } else if (side === 'left') {
                const diff = dx * naturalScale;
                newWidth = Math.max(20, initialWidth - diff);
                if (newWidth > 20) newX = initialX + diff;
            } else if (side === 'bottom-right') {
                const scaleX = (initialWidth + dx * naturalScale) / initialWidth;
                newWidth = Math.max(20, initialWidth * scaleX);
                newFontSize = Math.max(5, initialFontSize * scaleX);
            }

            updateObject(id, { width: newWidth, fontSize: newFontSize, x: newX });
        };

        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
    };

    const handleRotate = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        saveHistory(); // Save state before start
        setRotatingId(id); // Hide menu and indicate active state

        const target = objects.find(o => o.id === id);
        if (!target) return;

        // Get the element to manipulate directly
        // We need to query the specific DOM node for the text object
        // NOTE: We need to ensure the element allows direct styling override.
        // We will target the div with style={{ ... }} in the map loop.
        // Since we don't have a direct ref map, we can rely on data attributes or just standard query if we add an ID.
        // Let's assume we add `id="bubble-{id}"` to the container in the next step.
        const elId = `bubble-${id}`;
        const el = document.getElementById(elId);

        if (!el) {
            setRotatingId(null);
            return;
        }

        const imgElement = document.getElementById(`img-el-${target.imageId}`) as HTMLImageElement;
        const rect = imgElement.getBoundingClientRect();
        const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;
        const invScale = 1 / naturalScale;

        // Calculate center relative to client
        const objRectX = rect.left + (target.x * invScale);
        const objRectY = rect.top + (target.y * invScale);
        const objHeight = target.height ? (target.height * invScale) : (target.fontSize * 1.5 * invScale);
        const centerX = objRectX + (target.width * invScale) / 2;
        const centerY = objRectY + objHeight / 2;

        let finalAngle = target.rotation || 0;

        const move = (moveEvent: MouseEvent | TouchEvent) => {
            if ('touches' in moveEvent && moveEvent.cancelable) {
                moveEvent.preventDefault();
            }
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const dx = currentX - centerX;
            const dy = currentY - centerY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            angle += 90;

            if (moveEvent.shiftKey) {
                angle = Math.round(angle / 15) * 15;
            }

            finalAngle = angle;

            // Direct DOM update for 60fps performance
            el.style.transform = `rotate(${angle}deg)`;
            el.style.transformOrigin = 'center center';
        };

        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);

            // Commit final state
            updateObject(id, { rotation: finalAngle });
            setRotatingId(null);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
    };

    const generateFinalImages = async (includeObjects: boolean = true) => {
        if (typeof document !== 'undefined') await document.fonts.ready;
        return Promise.all(images.map(async (img) => {
            return new Promise<{ id: string, file: File, name: string }>((resolve, reject) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No context');

                const mainImage = new window.Image();
                mainImage.crossOrigin = "anonymous";

                // Helper to attempt loading from different sources
                const tryLoad = (src: string) => {
                    mainImage.src = src;
                };

                mainImage.onload = async () => {
                    canvas.width = mainImage.naturalWidth;
                    canvas.height = mainImage.naturalHeight;

                    // Ensure highest quality rendering and disable smoothing for sharp lines if preferred, or keep high.
                    // For Webtoons, 'high' is generally good, but sometimes 'false' is better for crisp text.
                    // We'll stick to 'high' as it's safer for mixed content.
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Draw base image
                    ctx.drawImage(mainImage, 0, 0);

                    const imgElement = document.getElementById(`img-el-${img.id}`) as HTMLImageElement;
                    const scale = 1; // Coordinates are now natural pixels

                    // 2. Draw Drawings (Eraser paths)
                    const pageDrawingList = drawings.filter(d => d.imageId === img.id);

                    for (const d of pageDrawingList) {
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        if (d.type === 'gradient' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined) {
                            const grad = ctx.createLinearGradient(d.x1 * scale, d.y1 * scale, d.x2 * scale, d.y2 * scale);
                            grad.addColorStop(0, d.color);
                            grad.addColorStop(1, d.color2 || d.color);
                            ctx.fillStyle = grad;

                            if (d.pathData) {
                                // For Rect Tool gradients, pathData defines the fill area
                                const pData = d.pathData.split(' ').map(token => {
                                    const num = parseFloat(token);
                                    return isNaN(num) ? token : num * scale;
                                }).join(' ');
                                const p = new Path2D(pData);
                                ctx.fill(p);
                            } else {
                                // For Gradient Tool, the bounds are derived from the vector
                                const minX = Math.min(d.x1, d.x2);
                                const minY = Math.min(d.y1, d.y2);
                                const width = Math.abs(d.x2 - d.x1);
                                const height = Math.abs(d.y2 - d.y1);
                                ctx.fillRect(minX * scale, minY * scale, width * scale, height * scale);
                            }
                        } else if (d.resultImage && d.x1 !== undefined && d.y1 !== undefined && d.x2 !== undefined && d.y2 !== undefined) {
                            // Use pre-calculated result (Inpaint, Blend, or Patch)
                            await new Promise<void>((res) => {
                                const resultImg = new window.Image();
                                resultImg.onload = () => {
                                    ctx.drawImage(resultImg, d.x1! * scale, d.y1! * scale, (d.x2! - d.x1!) * scale, (d.y2! - d.y1!) * scale);
                                    res();
                                };
                                resultImg.onerror = () => res();
                                resultImg.src = d.resultImage!;
                            });
                        } else if (d.pathData) {
                            const pData = d.pathData.split(' ').map(token => {
                                const num = parseFloat(token);
                                return isNaN(num) ? token : num * scale;
                            }).join(' ');
                            const p = new Path2D(pData);
                            ctx.fillStyle = d.color;
                            ctx.fill(p);
                        } else if (d.points && d.points.length > 0) {
                            if (d.type === 'blend') {
                                // Apply blend effect (Fallback if resultImage missing)
                                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                const data = imageData.data;
                                const blendRadius = (d.blendSize || 30) * scale / 2;
                                const strength = d.blendStrength || 0.5;

                                d.points.forEach(point => {
                                    const centerX = Math.round(point.x * scale);
                                    const centerY = Math.round(point.y * scale);
                                    for (let dy = -blendRadius; dy <= blendRadius; dy++) {
                                        for (let dx = -blendRadius; dx <= blendRadius; dx++) {
                                            const dist = Math.sqrt(dx * dx + dy * dy);
                                            if (dist > blendRadius) continue;
                                            const px = centerX + dx;
                                            const py = centerY + dy;
                                            if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
                                            let r = 0, g = 0, b = 0, count = 0;
                                            const sampleRadius = 3;
                                            for (let sy = -sampleRadius; sy <= sampleRadius; sy++) {
                                                for (let sx = -sampleRadius; sx <= sampleRadius; sx++) {
                                                    const nx = Math.min(canvas.width - 1, Math.max(0, px + sx));
                                                    const ny = Math.min(canvas.height - 1, Math.max(0, py + sy));
                                                    const idx = (ny * canvas.width + nx) * 4;
                                                    r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
                                                    count++;
                                                }
                                            }
                                            r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
                                            const falloff = 1 - (dist / blendRadius);
                                            const effectiveStrength = strength * falloff;
                                            const idx = (py * canvas.width + px) * 4;
                                            data[idx] = Math.round(data[idx] * (1 - effectiveStrength) + r * effectiveStrength);
                                            data[idx + 1] = Math.round(data[idx + 1] * (1 - effectiveStrength) + g * effectiveStrength);
                                            data[idx + 2] = Math.round(data[idx + 2] * (1 - effectiveStrength) + b * effectiveStrength);
                                        }
                                    }
                                });
                                ctx.putImageData(imageData, 0, 0);
                            } else if (d.type === 'patch' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined) {
                                const w = d.x2 - d.x1;
                                const h = d.y2 - d.y1;
                                const sx = d.x1 + (d.sx || 0);
                                const sy = d.y1 + (d.sy || 0);
                                ctx.save();
                                ctx.drawImage(canvas, sx * scale, sy * scale, w * scale, h * scale, d.x1 * scale, d.y1 * scale, w * scale, h * scale);
                                ctx.restore();
                            } else if (d.type === 'inpaint' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined) {
                                // Improved Iterative Smoothing Fallback
                                const x = Math.round(d.x1 * scale);
                                const y = Math.round(d.y1 * scale);
                                const w = Math.round((d.x2 - d.x1) * scale);
                                const h = Math.round((d.y2 - d.y1) * scale);

                                if (w > 0 && h > 0) {
                                    const imgData = ctx.getImageData(x, y, w, h);
                                    const data = imgData.data;
                                    const bTop = ctx.getImageData(x, Math.max(0, y - 1), w, 1).data;
                                    const bBottom = ctx.getImageData(x, Math.min(canvas.height - 1, y + h), w, 1).data;
                                    const bLeft = ctx.getImageData(Math.max(0, x - 1), y, 1, h).data;
                                    const bRight = ctx.getImageData(Math.min(canvas.width - 1, x + w), y, 1, h).data;

                                    for (let j = 0; j < h; j++) {
                                        for (let i = 0; i < w; i++) {
                                            const idx = (j * w + i) * 4;
                                            const wT = 1 / (j + 1); const wB = 1 / (h - j); const wL = 1 / (i + 1); const wR = 1 / (w - i);
                                            const sum = wT + wB + wL + wR;
                                            for (let k = 0; k < 3; k++) data[idx + k] = (bTop[i * 4 + k] * wT + bBottom[i * 4 + k] * wB + bLeft[j * 4 + k] * wL + bRight[j * 4 + k] * wR) / sum;
                                            data[idx + 3] = 255;
                                        }
                                    }
                                    let current = new Uint8ClampedArray(data);
                                    let next = new Uint8ClampedArray(data);
                                    for (let iter = 0; iter < 40; iter++) {
                                        for (let j = 0; j < h; j++) {
                                            for (let i = 0; i < w; i++) {
                                                const idx = (j * w + i) * 4;
                                                for (let k = 0; k < 3; k++) {
                                                    let s = 0, c = 0;
                                                    if (i > 0) { s += current[idx - 4 + k]; c++; } else { s += bLeft[j * 4 + k]; c++; }
                                                    if (i < w - 1) { s += current[idx + 4 + k]; c++; } else { s += bRight[j * 4 + k]; c++; }
                                                    if (j > 0) { s += current[idx - w * 4 + k]; c++; } else { s += bTop[i * 4 + k]; c++; }
                                                    if (j < h - 1) { s += current[idx + w * 4 + k]; c++; } else { s += bBottom[i * 4 + k]; c++; }
                                                    next[idx + k] = s / c;
                                                }
                                            }
                                        }
                                        [current, next] = [next, current];
                                    }
                                    data.set(current);
                                    ctx.putImageData(imgData, x, y);
                                }
                            } else {
                                // Regular eraser stroke
                                ctx.lineWidth = (d.isFill ? 1 : d.strokeWidth) * scale;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.strokeStyle = d.color;
                                ctx.fillStyle = d.color;
                                ctx.beginPath();
                                ctx.moveTo(d.points[0].x * scale, d.points[0].y * scale);
                                d.points.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * scale, p.y * scale); });
                                if (d.isFill) ctx.fill(); else ctx.stroke();
                            }
                        }
                    }

                    // 3. Draw objects
                    if (includeObjects) {
                        const pageObjects = objects.filter(o => o.imageId === img.id);
                        pageObjects.forEach((obj) => {
                            ctx.save();

                            // Use natural coordinates directly (scale = 1)
                            const x = obj.x;
                            const y = obj.y;
                            const w = obj.width;
                            const h = obj.height || (obj.fontSize * 1.5);
                            const fontSize = obj.fontSize;

                            // Background styling
                            const bgPaddingX = obj.bgPaddingX ?? 10;
                            const bgPaddingY = obj.bgPaddingY ?? 10;
                            const borderRadius = obj.bgBorderRadius ?? 8;
                            const bgOpacity = obj.bgOpacity ?? 1;

                            ctx.translate(x, y);
                            ctx.rotate((obj.rotation * Math.PI) / 180);

                            // Draw Background Box
                            if (obj.backgroundColor !== 'transparent') {
                                const hexToRgba = (hex: string, opacity: number) => {
                                    if (!hex.startsWith('#')) return hex;
                                    const r = parseInt(hex.slice(1, 3), 16);
                                    const g = parseInt(hex.slice(3, 5), 16);
                                    const b = parseInt(hex.slice(5, 7), 16);
                                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                                };

                                ctx.fillStyle = hexToRgba(obj.backgroundColor, bgOpacity);

                                // Draw rounded rectangle
                                const r = borderRadius;
                                ctx.beginPath();
                                ctx.moveTo(r, 0);
                                ctx.lineTo(w - r, 0);
                                ctx.quadraticCurveTo(w, 0, w, r);
                                ctx.lineTo(w, h - r);
                                ctx.quadraticCurveTo(w, h, w - r, h);
                                ctx.lineTo(r, h);
                                ctx.quadraticCurveTo(0, h, 0, h - r);
                                ctx.lineTo(0, r);
                                ctx.quadraticCurveTo(0, 0, r, 0);
                                ctx.closePath();
                                ctx.fill();
                            }

                            // Resolve Font
                            let fontFamily = obj.fontFamily;
                            if (fontFamily.includes('var(')) {
                                const varMatch = fontFamily.match(/var\(([^)]+)\)/);
                                if (varMatch && typeof window !== 'undefined') {
                                    const computed = getComputedStyle(document.body).getPropertyValue(varMatch[1]);
                                    if (computed) fontFamily = computed;
                                    else fontFamily = fontFamily.split(',').slice(1).join(',');
                                }
                            }
                            fontFamily = fontFamily.replace(/"/g, "'");

                            ctx.font = `${obj.fontWeight} ${fontSize}px ${fontFamily}`;
                            ctx.strokeStyle = obj.strokeColor || 'transparent';
                            ctx.lineWidth = obj.strokeWidth || 0;
                            ctx.lineJoin = 'round';
                            ctx.miterLimit = 2;

                            // Helper for word wrapping
                            const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
                                const words = text.split(' ');
                                const lines: string[] = [];
                                let currentLine = words[0];

                                for (let i = 1; i < words.length; i++) {
                                    const word = words[i];
                                    const width = ctx.measureText(currentLine + " " + word).width;
                                    if (width < maxWidth) {
                                        currentLine += " " + word;
                                    } else {
                                        lines.push(currentLine);
                                        currentLine = word;
                                    }
                                }

                                // Check if the last remaining line (or single long word) fits
                                if (ctx.measureText(currentLine).width > maxWidth) {
                                    // Force break characters if a single word is too long
                                    const chars = currentLine.split('');
                                    let subLine = '';
                                    chars.forEach(char => {
                                        if (ctx.measureText(subLine + char).width < maxWidth) {
                                            subLine += char;
                                        } else {
                                            lines.push(subLine);
                                            subLine = char;
                                        }
                                    });
                                    lines.push(subLine);
                                } else {
                                    lines.push(currentLine);
                                }

                                return lines;
                            };

                            // Process text with both explicit newlines and automatic wrapping
                            const rawLines = obj.text.split('\n');
                            let lines: string[] = [];
                            // Auto-size detection & Effective Padding
                            const isAutoSize = !obj.height;
                            const effPaddingX = obj.backgroundColor === 'transparent' ? 0 : bgPaddingX;
                            const effPaddingY = obj.backgroundColor === 'transparent' ? 0 : bgPaddingY;
                            const maxWidth = w - (effPaddingX * 2);

                            rawLines.forEach(line => {
                                if (ctx.measureText(line).width > maxWidth) {
                                    lines.push(...getWrappedLines(ctx, line, maxWidth));
                                } else {
                                    lines.push(line);
                                }
                            });

                            const lineHeight = fontSize * (obj.lineHeight || 1.2);
                            const totalTextHeight = lines.length * lineHeight;

                            // Vertical Position Calculation
                            let blockTopY = 0;
                            if (isAutoSize) {
                                blockTopY = effPaddingY;
                            } else {
                                const blockCenterY = h / 2;
                                blockTopY = blockCenterY - (totalTextHeight / 2);
                            }

                            ctx.textBaseline = 'middle';

                            // Horizontal Alignment
                            if (obj.textAlign === 'center') {
                                ctx.textAlign = 'center';
                            } else if (obj.textAlign === 'right') {
                                ctx.textAlign = 'right';
                            } else {
                                ctx.textAlign = 'left';
                            }

                            const hexToRgbaAlpha = (hex: string, alpha: number) => {
                                if (!hex || !hex.startsWith('#')) return hex;
                                let r, g, b;
                                if (hex.length === 4) {
                                    r = parseInt(hex[1] + hex[1], 16);
                                    g = parseInt(hex[2] + hex[2], 16);
                                    b = parseInt(hex[3] + hex[3], 16);
                                } else {
                                    r = parseInt(hex.slice(1, 3), 16);
                                    g = parseInt(hex.slice(3, 5), 16);
                                    b = parseInt(hex.slice(5, 7), 16);
                                }
                                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                            };

                            // Implement Gradient Fill
                            let effectiveFillStyle: string | CanvasGradient = obj.color;
                            if (obj.gradientEnabled) {
                                try {
                                    const actualH = obj.height || totalTextHeight + (effPaddingY * 2);

                                    // Use standard CSS linear-gradient math for length
                                    const thetaRad = (obj.gradientAngle || 180) * Math.PI / 180;
                                    const L = Math.abs(w * Math.sin(thetaRad)) + Math.abs(actualH * Math.cos(thetaRad));
                                    const length = L / 2;

                                    // Mathematical angle for cos/sin projections
                                    const angleRad = ((obj.gradientAngle || 180) - 90) * Math.PI / 180;
                                    const cx = w / 2;
                                    const cy = actualH / 2;

                                    const gx1 = cx - Math.cos(angleRad) * length;
                                    const gy1 = cy - Math.sin(angleRad) * length;
                                    const gx2 = cx + Math.cos(angleRad) * length;
                                    const gy2 = cy + Math.sin(angleRad) * length;

                                    const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
                                    grad.addColorStop(0, obj.color);
                                    grad.addColorStop(1, obj.color2 || obj.color);
                                    effectiveFillStyle = grad;
                                } catch (e) {
                                    console.error("Gradient creation failed", e);
                                    effectiveFillStyle = obj.color;
                                }
                            }

                            const drawTextContent = () => {
                                lines.forEach((line, i) => {
                                    const lineY = blockTopY + (i * lineHeight) + (lineHeight / 2);
                                    let lineX = 0;

                                    if (obj.textAlign === 'center') lineX = w / 2;
                                    else if (obj.textAlign === 'right') lineX = w - effPaddingX;
                                    else lineX = effPaddingX;

                                    // Draw Stroke
                                    if (obj.strokeWidth && obj.strokeWidth > 0) {
                                        ctx.strokeText(line, lineX, lineY);
                                    }
                                    // Draw Fill
                                    ctx.fillText(line, lineX, lineY);

                                    // Underline
                                    if (obj.textDecoration === 'underline') {
                                        const metrics = ctx.measureText(line);
                                        const underlineY = lineY + fontSize * 0.1;
                                        let underlineX = lineX;
                                        if (obj.textAlign === 'center') underlineX = lineX - metrics.width / 2;
                                        else if (obj.textAlign === 'right') underlineX = lineX - metrics.width;

                                        ctx.save();
                                        ctx.strokeStyle = obj.color;
                                        ctx.lineWidth = Math.max(1, fontSize / 15);
                                        ctx.beginPath();
                                        ctx.moveTo(underlineX, underlineY);
                                        ctx.lineTo(underlineX + metrics.width, underlineY);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                });
                            };

                            // 1. Draw Glow
                            if (obj.glowBlur && obj.glowBlur > 0) {
                                ctx.save();
                                ctx.shadowBlur = obj.glowBlur;
                                ctx.shadowColor = hexToRgbaAlpha(obj.glowColor || '#FFFFFF', obj.glowOpacity || 1);
                                ctx.fillStyle = effectiveFillStyle;
                                drawTextContent();
                                ctx.restore();
                            }

                            // 2. Draw Shadow
                            if (obj.shadowBlur && obj.shadowBlur > 0) {
                                ctx.save();
                                ctx.shadowBlur = obj.shadowBlur;
                                ctx.shadowOffsetX = obj.shadowOffsetX || 0;
                                ctx.shadowOffsetY = obj.shadowOffsetY || 0;
                                ctx.shadowColor = hexToRgbaAlpha(obj.shadowColor || '#000000', obj.shadowOpacity || 1);
                                ctx.fillStyle = effectiveFillStyle;
                                drawTextContent();
                                ctx.restore();
                            }

                            // 3. Draw Base Text
                            ctx.fillStyle = effectiveFillStyle;
                            drawTextContent();

                            ctx.restore();
                        });
                    }

                    const name = img.file ? img.file.name.replace(/\.[^/.]+$/, "") + ".png" : `image-${img.id}.png`;

                    // Use toBlob for memory efficiency and robust large image handling
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const file = new File([blob], name, { type: 'image/png' });
                            resolve({ id: img.id, file, name });
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    }, 'image/png');
                };
                mainImage.onerror = (e) => {
                    console.error(`Failed to load base image for ${img.id}. URL: ${mainImage.src}`, e);

                    // FALLBACK: If the URL failed and we have the original file, try creating a fresh URL
                    if (img.file && !mainImage.src.startsWith('data:')) {
                        console.warn(`Attempting fallback to fresh Blob URL for ${img.id}`);
                        const freshUrl = URL.createObjectURL(img.file);
                        // Update the ref so we don't fail again
                        baseImagesRef.current[img.id] = freshUrl;
                        tryLoad(freshUrl);
                    } else {
                        reject(new Error(`Зургийг ачаалж чадсангүй (${img.id}). Линк хүчингүй болсон байж магадгүй.`));
                    }
                };

                // Initial load attempt
                tryLoad(baseImagesRef.current[img.id] || img.cleanUrl || img.preview);
            });
        }));
    };
    // --- AUTO-SAVE LOGIC ---
    useEffect(() => {
        if (!activeChapterId) return;

        const timeoutId = setTimeout(() => {
            // Auto-Save: JSON Only (No Baking)
            onSaveChapter(
                activeChapterId,
                [],
                objectsMap[activeChapterId] || [],
                drawingsMap[activeChapterId] || [],
                [],
                true // SILENT = TRUE (Don't close editor, don't show toast)
            );
        }, 2000); // Debounce 2s

        return () => clearTimeout(timeoutId);
    }, [objects, drawings, activeChapterId]); // Trigger on state change

    const handleDownload = async () => {
        if (images.length === 0) return;
        setIsSavingLocal(true);
        try {
            const finalImages = await generateFinalImages();
            finalImages.forEach((img) => {
                const url = URL.createObjectURL(img.file);
                const link = document.createElement('a');
                link.href = url;
                link.download = `edited-${img.name}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingLocal(false);
        }
    };

    const handleSaveLocal = async () => {
        if (images.length === 0) return;
        setIsSavingLocal(true);
        const t = undefined; // toast.loading(`${activeChapter.name} хадгалж байна...`);

        try {
            isCommittedRef.current = true; // Prevent auto-save on unmount
            localStorage.removeItem(`editor_backup_${activeChapterId}`); // Clear backup

            // MANUAL SAVE: Bake images for Dashboard Preview / Publishing
            const bakedImages = await generateFinalImages(true);
            const cleanImages = await generateFinalImages(false);

            onSaveChapter(
                activeChapterId,
                bakedImages,
                objectsMap[activeChapterId] || [],
                drawingsMap[activeChapterId] || [],
                [] // Stop baking manual drawings into clean background
            );
            toast.success('Бүлэг амжилттай хадгалагдлаа');
            // toast.success('Амжилттай хадгалагдлаа', { id: t });
        } catch (err: any) {
            console.error("Save Error:", err);
            isCommittedRef.current = false; // Revert on error
            const msg = err?.message || (typeof err === 'string' ? err : 'Тодорхойгүй алдаа');
            toast.error(`Хадгалахад алдаа гарлаа: ${msg}`);
        } finally {
            setIsSavingLocal(false);
            // toast.dismiss(t);
        }
    };

    // --- HOTKEYS IMPLEMENTATION ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveLocal();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }

            if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                redo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId && selectedObject) {
                e.preventDefault();
                saveHistory();
                const newId = Math.random().toString(36).substr(2, 9);
                const duplicate: TextObject = {
                    ...selectedObject,
                    id: newId,
                    x: selectedObject.x + 20,
                    y: selectedObject.y + 20
                };
                setObjectsMap(prev => ({
                    ...prev,
                    [activeChapterId]: [...(prev[activeChapterId] || []), duplicate]
                }));
                setSelectedId(newId);
                toast("Duplicated", { position: 'bottom-center' });
                return;
            }

            if (e.key.toLowerCase() === 'e') {
                setIsEraserActive(prev => {
                    const next = !prev;
                    if (next) setIsTextToolActive(false);
                    toast(next ? "Eraser Tool (Manual)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }

            if (e.key.toLowerCase() === 'p') {
                setIsPatchActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                    }
                    toast(next ? "Patch Tool (Pro)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }

            if (e.key.toLowerCase() === 'i') {
                setIsInpaintActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                        setIsPatchActive(false);
                    }
                    toast(next ? "Smart Inpaint Active ✨" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }

            if (e.key.toLowerCase() === 'v') {
                setIsEraserActive(false);
                setIsTextToolActive(false);
                setSelectedId(null);
                toast("Move Tool", { position: 'bottom-center' });
            }

            if (e.key.toLowerCase() === 't') {
                setIsTextToolActive(prev => {
                    const next = !prev;
                    if (next) setIsEraserActive(false);
                    toast(next ? "Text Tool Active (Click image to add)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    deleteObject(selectedId);
                    toast("Deleted", { position: 'bottom-center' });
                }
            }

            if (e.key === '[') {
                if (isEraserActive) {
                    setEraserSize(s => Math.max(5, s - 5));
                } else if (selectedId && selectedObject) {
                    updateObject(selectedId, { fontSize: Math.max(10, selectedObject.fontSize - 2) });
                }
            }

            if (e.key === ']') {
                if (isEraserActive) {
                    setEraserSize(s => Math.min(100, s + 5));
                } else if (selectedId && selectedObject) {
                    updateObject(selectedId, { fontSize: Math.min(200, selectedObject.fontSize + 2) });
                }
            }
            if (e.key.toLowerCase() === 'w') {
                setIsMagicWandActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsRectToolActive(false);
                    }
                    toast(next ? "Magic Wand Active (Click bubble to clean)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }
            if (e.key.toLowerCase() === 'r') {
                setIsRectToolActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsGradientActive(false);
                    }
                    toast(next ? "Rect Tool Active (Drag to clean region)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }
            if (e.key.toLowerCase() === 'g') {
                setIsGradientActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsBlendActive(false);
                    }
                    toast(next ? "Gradient Tool Active (Drag to blend colors)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }
            if (e.key.toLowerCase() === 'b') {
                setIsBlendActive(prev => {
                    const next = !prev;
                    if (next) {
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                    }
                    if (e.key.toLowerCase() === 'c') {
                        setIsCropActive(prev => {
                            const next = !prev;
                            if (next) {
                                setIsEraserActive(false);
                                setIsTextToolActive(false);
                                setIsMagicWandActive(false);
                                setIsRectToolActive(false);
                                setIsGradientActive(false);
                            }
                            return next;
                        });
                    }
                    toast(next ? "Blend Tool Active (Drag to blend/blur)" : "Move Tool", { position: 'bottom-center' });
                    return next;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChapterId, selectedId, selectedObject, isEraserActive, isTextToolActive, isMagicWandActive, isRectToolActive, isGradientActive, isBlendActive, magicWandThreshold, currentRect, currentGradient, currentBlendPath, images, objects, undo, redo, handleSaveLocal, deleteObject, updateObject, saveHistory, handleRectEnd, handleGradientEnd, handleBlendEnd]);

    // --- AUTOMATION: Full Manual Edit Mode ---
    const handleAutoTranslate = async () => {
        const activeImg = images.find(i => {
            const el = document.getElementById(`img-el-${i.id}`);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
        }) || images[0];

        if (!activeImg) return;

        // Prevent double click
        if (activeImg.cleanUrl && activeImg.cleanUrl.startsWith('data:')) {
            if (!confirm("Энэ зураг дээр аль хэдийн Clean хийгдсэн байна. Дахин хийх үү?")) return;
        }

        const tId = toast.loading("Автоматжуулж байна... 0%");
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            if (progress > 90) progress = 90; // Stall at 90%
            toast.loading(`Автоматжуулж байна... ${progress}%`, { id: tId });
        }, 500);

        try {
            // 1. Get Image Blob
            const imgEl = document.getElementById(`img-el-${activeImg.id}`) as HTMLImageElement;
            if (!imgEl) throw new Error("Image not found");

            const blob = await new Promise<Blob>((resolve, reject) => {
                const canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth;
                canvas.height = imgEl.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("No context")); return; }
                ctx.drawImage(imgEl, 0, 0);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error("Blob failed")), 'image/jpeg', 0.95);
            });

            // 2. Prepare Form Data
            const formData = new FormData();
            formData.append('image', blob);

            // 3. Send to Backend
            const res = await fetch(backendUrl, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("Backend Error");

            const data = await res.json();

            // 4. Handle Response
            if (data.clean_image && data.regions) {
                // A. Update Background to Clean Image
                const cleanUrl = data.clean_image; // Is data uri

                if (onUpdateImage) {
                    onUpdateImage(activeChapterId, activeImg.id, cleanUrl);
                }

                // B. Add Text Objects
                const newObjects: TextObject[] = data.regions.map((reg: any, idx: number) => {
                    const [x1, y1, x2, y2] = reg.xyxy;
                    const text = reg.translation || reg.text;
                    const width = x2 - x1;
                    const height = y2 - y1;

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        imageId: activeImg.id,
                        text: text,
                        originalText: reg.text,
                        x: x1,
                        y: y1, // Simple positioning
                        width: width,
                        height: height,
                        fontSize: 20, // Default start size
                        fontFamily: 'CCWildWords', // Good webtoon default
                        color: '#000000',
                        textAlign: 'center',
                        backgroundColor: 'transparent',
                        lineHeight: 1.2,
                        letterSpacing: 0,
                        opacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWidth: 4,
                        rotation: 0,
                        fontWeight: 'normal',
                        fontStyle: 'normal',
                        autoFitEnabled: true // Enable our autofit logic to resize it perfectly
                    };
                });

                setObjectsMap(prev => ({
                    ...prev,
                    [activeChapterId]: [...(prev[activeChapterId] || []), ...newObjects]
                }));

                clearInterval(interval);
                toast.success("Амжилттай! (100%)", { id: tId });
            } else {
                throw new Error("Invalid response format");
            }

        } catch (e) {
            console.error(e);
            clearInterval(interval);
            toast.error("Автоматжуулалт амжилтгүй боллоо.", { id: tId });
        }
    };

    // --- CLIENT-SIDE QUICK CLEAN (Tesseract) ---
    const handleQuickClean = async () => {
        const activeImg = images.find(i => {
            const el = document.getElementById(`img-el-${i.id}`);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
        }) || images[0];

        if (!activeImg) return;

        const tId = toast.loading("Текстийг хайж байна... (Browser OCR)");

        try {
            const imgEl = document.getElementById(`img-el-${activeImg.id}`) as HTMLImageElement;
            if (!imgEl) {
                // Fallback: load image manually
                const image = new window.Image();
                image.crossOrigin = "anonymous";
                image.src = activeImg.translatedUrl || activeImg.preview;
                await new Promise((res, rej) => {
                    image.onload = res;
                    image.onerror = rej;
                });

                const result = await Tesseract.recognize(
                    image,
                    'eng+jpn+kor+chi_sim', // Multi-language for better detection
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                toast.loading(`Уншиж байна... ${Math.round(m.progress * 100)}%`, { id: tId });
                            }
                        }
                    }
                );

                console.log("Tesseract Result:", result);

                const words = (result.data as any)?.words || [];
                if (!words.length) {
                    toast.error("Текст олдсонгүй (No text detected)", { id: tId });
                    return;
                }
                // OCR Process
                const newMasks: EraserObject[] = words.map((word: any) => {
                    const { x0, y0, x1, y1 } = word.bbox;
                    const padding = 5;

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        imageId: activeImg.id,
                        type: 'solid',
                        x1: x0 - padding,
                        y1: y0 - padding,
                        x2: x1 + padding,
                        y2: y1 + padding,
                        color: '#FFFFFF',
                        isFill: true,
                        strokeWidth: 0
                    };
                });

                setDrawingsMap(prev => ({
                    ...prev,
                    [activeChapterId]: [...(prev[activeChapterId] || []), ...newMasks]
                }));

                toast.success(`Амжилттай! ${newMasks.length} хэсэг цэвэрлэлээ.`, { id: tId });
                return;
            }

            // Use existing image element
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");
            ctx.drawImage(imgEl, 0, 0);

            const result = await Tesseract.recognize(
                canvas.toDataURL('image/png'),
                'eng+jpn+kor+chi_sim',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            toast.loading(`Уншиж байна... ${Math.round(m.progress * 100)}%`, { id: tId });
                        }
                    }
                }
            );

            console.log("Tesseract Result:", result);

            const words = (result.data as any)?.words || [];
            if (!words.length) {
                toast.error("Текст олдсонгүй (No text detected)", { id: tId });
                return;
            }

            const newMasks: EraserObject[] = words.map((word: any) => {
                const { x0, y0, x1, y1 } = word.bbox;
                const padding = 5;

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    imageId: activeImg.id,
                    type: 'solid',
                    x1: x0 - padding,
                    y1: y0 - padding,
                    x2: x1 + padding,
                    y2: y1 + padding,
                    color: '#FFFFFF',
                    isFill: true,
                    strokeWidth: 0
                };
            });

            if (newMasks.length === 0) {
                toast.error("Текст олдсонгүй", { id: tId });
                return;
            }

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), ...newMasks]
            }));

            toast.success(`Амжилттай! ${newMasks.length} хэсэг цэвэрлэлээ.`, { id: tId });

        } catch (e) {
            console.error(e);
            toast.error("Quick Clean алдаа гарлаа", { id: tId });
        }
    };

    // --- AI BUBBLE DETECTION (Backend) ---
    const handleBubbleDetect = async () => {
        const activeImg = images.find(i => {
            const el = document.getElementById(`img-el-${i.id}`);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
        }) || images[0];

        if (!activeImg) return;

        const tId = toast.loading("Бөмбөлөг илрүүлж байна... (AI Detection)");

        try {
            // Prepare image for upload
            const imgEl = document.getElementById(`img-el-${activeImg.id}`) as HTMLImageElement;
            if (!imgEl) throw new Error("Image element not found");

            // Convert to blob
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");
            ctx.drawImage(imgEl, 0, 0);

            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/png');
            });

            // Send to backend
            const formData = new FormData();
            formData.append('image', blob, 'image.png');

            const response = await fetch(`${backendUrl}/detect_bubbles`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Backend error: ${response.status}`);

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const bubbles = data.bubbles || [];
            if (bubbles.length === 0) {
                toast.error("Бөмбөлөг олдсонгүй", { id: tId });
                return;
            }

            // Create white masks for each bubble
            const newMasks: EraserObject[] = bubbles.map((bubble: any) => {
                const padding = 5;
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    imageId: activeImg.id,
                    type: 'solid',
                    x1: bubble.x1 - padding,
                    y1: bubble.y1 - padding,
                    x2: bubble.x2 + padding,
                    y2: bubble.y2 + padding,
                    color: '#FFFFFF',
                    isFill: true,
                    strokeWidth: 0
                };
            });

            setDrawingsMap(prev => ({
                ...prev,
                [activeChapterId]: [...(prev[activeChapterId] || []), ...newMasks]
            }));

            toast.success(`Амжилттай! ${newMasks.length} бөмбөлөг цэвэрлэлээ.`, { id: tId });

        } catch (e) {
            console.error(e);
            toast.error("AI Bubble Detection алдаа гарлаа", { id: tId });
        }
    };

    // --- DRAG & DROP FONT UPLOAD ---


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#050505] flex flex-col md:flex-row overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Mobile Header (Floating) */}
            <div className="md:hidden absolute top-0 left-0 right-0 p-4 z-50 flex items-center justify-between pointer-events-none">
                <button
                    onClick={onClose}
                    className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white pointer-events-auto border border-white/10 shadow-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-2 pointer-events-auto items-center">
                    <button
                        onClick={undo}
                        disabled={!historyMap[activeChapterId]?.past?.length}
                        className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 shadow-lg disabled:opacity-30"
                        title="Undo"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!historyMap[activeChapterId]?.future?.length}
                        className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 shadow-lg disabled:opacity-30"
                        title="Redo"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    <button
                        onClick={handleDownload}
                        disabled={isSavingLocal}
                        className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full font-bold text-xs uppercase shadow-lg border border-white/10 mr-1"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSaveLocal}
                        disabled={isSavingLocal}
                        className="px-4 py-2 bg-primary/90 backdrop-blur-md text-white rounded-full font-bold text-xs uppercase shadow-lg shadow-primary/20 border border-white/10"
                    >
                        {isSavingLocal ? <CircleDashed className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                </div>
            </div>

            {/* Left Sidebar: Tools (Desktop) */}
            <div className="hidden md:flex w-20 bg-surface border-r border-white/5 flex-col items-center py-8 gap-4 shadow-2xl z-30 overflow-y-auto scrollbar-hide h-full flex-shrink-0">
                <button
                    onClick={onClose}
                    className="p-4 hover:bg-white/5 rounded-2xl text-muted hover:text-white transition-all mb-4"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* History Controls */}
                <div className="flex flex-col gap-2 mb-4 p-2 bg-white/5 rounded-2xl">
                    <button
                        onClick={undo}
                        disabled={!historyMap[activeChapterId]?.past?.length}
                        className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="h-[1px] bg-white/10 w-full" />
                    <button
                        onClick={redo}
                        disabled={!historyMap[activeChapterId]?.future?.length}
                        className="p-2 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all disabled:opacity-30"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <RotateCw className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={() => {
                        setIsTextToolActive(!isTextToolActive);
                        setIsEraserActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isTextToolActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Текст нэмэх (T)"
                >
                    <Type className="w-6 h-6" />
                </button>

                {/* Eraser Toggle */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsEraserActive(!isEraserActive);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isEraserActive
                                ? "bg-white text-black shadow-white/20 scale-110 ring-2 ring-primary"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Eraser (Manual Clean)"
                    >
                        <Eraser className="w-6 h-6" />
                    </button>
                    {isEraserActive && (
                        <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-2 w-full animate-in fade-in zoom-in">
                            <span className="text-[8px] uppercase font-black text-center text-muted">Size</span>
                            <input
                                type="range"
                                min="5" max="100"
                                value={eraserSize}
                                onChange={(e) => setEraserSize(Number(e.target.value))}
                                className="w-full h-1 accent-primary bg-white/10 rounded-full"
                            />
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        setIsCropActive(!isCropActive);
                        setIsEraserActive(false);
                        setIsTextToolActive(false);
                        setIsMagicWandActive(false);
                        setIsRectToolActive(false);
                        setIsGradientActive(false);
                        setIsBlendActive(false);
                    }}
                    className={cn(
                        "p-4 rounded-2xl shadow-lg transition-all",
                        isCropActive
                            ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                            : "bg-white/5 text-muted hover:text-white"
                    )}
                    title="Crop Tool (C)"
                >
                    <Crop className="w-6 h-6" />
                </button>

                {/* Magic Wand */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsMagicWandActive(!isMagicWandActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsRectToolActive(false);
                            setIsBlendActive(false);
                            setIsGradientActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isMagicWandActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Magic Wand (W) - Auto-detect bubble"
                    >
                        <Wand2 className="w-6 h-6" />
                    </button>
                    {isMagicWandActive && (
                        <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-3 w-full animate-in fade-in zoom-in">
                            <div className="flex bg-black/40 rounded-lg p-0.5">
                                <button
                                    onClick={() => setMagicWandMode('solid')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[8px] font-black uppercase rounded-md transition-all",
                                        magicWandMode === 'solid' ? "bg-primary text-white" : "text-muted hover:text-white"
                                    )}
                                >
                                    Solid
                                </button>
                                <button
                                    onClick={() => setMagicWandMode('gradient')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[8px] font-black uppercase rounded-md transition-all",
                                        magicWandMode === 'gradient' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-white"
                                    )}
                                >
                                    Gradient
                                </button>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[8px] uppercase font-black text-muted">Radius</span>
                                    <span className="text-[8px] font-black text-primary">{magicWandThreshold}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1" max="100"
                                    value={magicWandThreshold}
                                    onChange={(e) => setMagicWandThreshold(Number(e.target.value))}
                                    className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Rect Tool */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsRectToolActive(!isRectToolActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsGradientActive(false);
                            setIsBlendActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isRectToolActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Rect Tool (R) - Select region to clean"
                    >
                        <Square className="w-6 h-6" />
                    </button>
                </div>

                {/* Gradient Tool */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsGradientActive(!isGradientActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                            setIsBlendActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isGradientActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Gradient Tool (G) - Draw gradient blend"
                    >
                        <Blend className="w-6 h-6" />
                    </button>
                </div>

                {/* Blend Tool */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsBlendActive(!isBlendActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                            setIsGradientActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isBlendActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Blend Tool (B) - Blur/Blend colors"
                    >
                        <Droplet className="w-6 h-6" />
                    </button>
                    {isBlendActive && (
                        <div className="bg-surface border border-white/10 p-2 rounded-xl flex flex-col gap-2 w-full animate-in fade-in zoom-in">
                            <span className="text-[8px] uppercase font-black text-center text-muted">Size</span>
                            <input
                                type="range"
                                min="10" max="100"
                                value={blendSize}
                                onChange={(e) => setBlendSize(Number(e.target.value))}
                                className="w-full h-1 accent-primary bg-white/10 rounded-full"
                            />
                            <span className="text-[8px] font-black text-center text-primary">{blendSize}px</span>
                            <span className="text-[8px] uppercase font-black text-center text-muted mt-2">Strength</span>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={blendStrength}
                                onChange={(e) => setBlendStrength(Number(e.target.value))}
                                className="w-full h-1 accent-primary bg-white/10 rounded-full"
                            />
                            <span className="text-[8px] font-black text-center text-primary">{Math.round(blendStrength * 100)}%</span>
                        </div>
                    )}
                </div>

                {/* Patch Tool */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsPatchActive(!isPatchActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                            setIsGradientActive(false);
                            setIsBlendActive(false);
                            setIsInpaintActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isPatchActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Patch Tool (P) - Photoshop style cloning"
                    >
                        <ScanLine className="w-6 h-6" />
                    </button>
                </div>

                {/* Smart Inpaint Tool */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsInpaintActive(!isInpaintActive);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                            setIsGradientActive(false);
                            setIsBlendActive(false);
                            setIsPatchActive(false);
                            setIsContextAwareActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isInpaintActive
                                ? "bg-primary text-white shadow-primary/20 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Smart Inpaint (AI) - Content-Aware Fill"
                    >
                        <Sparkles className="w-6 h-6" />
                    </button>
                </div>

                {/* Context Aware Fill Tool (LaMa ONNX) */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => {
                            setIsContextAwareActive(!isContextAwareActive);
                            setIsInpaintActive(false);
                            setIsEraserActive(false);
                            setIsTextToolActive(false);
                            setIsMagicWandActive(false);
                            setIsRectToolActive(false);
                            setIsGradientActive(false);
                            setIsBlendActive(false);
                            setIsPatchActive(false);
                        }}
                        className={cn(
                            "p-4 rounded-2xl shadow-lg transition-all",
                            isContextAwareActive
                                ? "bg-purple-600 text-white shadow-purple-900/40 scale-110 ring-2 ring-white/20"
                                : "bg-white/5 text-muted hover:text-white"
                        )}
                        title="Context-Aware Fill (LaMa ONNX)"
                    >
                        <Zap className="w-6 h-6" />
                    </button>
                </div>


                <div className="w-8 h-[1px] bg-white/5 my-2" />

                <button
                    onClick={onCleanAll}
                    disabled={isCleaning}
                    className={cn(
                        "p-4 rounded-2xl transition-all",
                        isCleaning ? "bg-white/5 animate-pulse" : "bg-white/5 hover:bg-white/10 text-primary"
                    )}
                    title={mode === 'cleaner' ? "Бүх зургийг AI-аар цэвэрлэх" : "AI Орчуулга эхлүүлэх"}
                >
                    {isCleaning ? (
                        <CircleDashed className="w-6 h-6 animate-spin" />
                    ) : (
                        mode === 'cleaner' ? <Wand2 className="w-6 h-6" /> : <Languages className="w-6 h-6" />
                    )}
                </button>
            </div>

            {/* Chapters Sidebar (Desktop Only) */}
            <div className={cn("hidden md:flex w-64 bg-surface/50 border-r border-white/5 flex-col py-8 shadow-xl z-20 transition-all duration-300", isFocusMode && "w-0 opacity-0 border-none p-0")}>
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

            {/* Page Navigation Rail: Mini-thumbnails (Desktop Only) */}
            <div className="hidden md:flex w-24 bg-black/40 border-r border-white/5 flex-col items-center py-8 gap-4 shadow-2xl z-20 overflow-y-auto scrollbar-hide">
                <div className="text-[8px] font-black uppercase text-muted tracking-widest mb-2 opacity-50">Pages</div>
                {
                    images.map((img, idx) => (
                        <button
                            key={img.id}
                            onClick={() => {
                                // Calculate target Y position for this page
                                // Since we use transform for positioning, we need to update viewport.y
                                // We know pages are stacked vertically with gap-12 (48px)
                                // But calculating exact pixel height of previous images is tricky without refs.
                                // HOWEVER, we have `page-{img.id}` elements. We can get their offsetTop relative to the container.

                                const el = document.getElementById(`page-${img.id}`);
                                if (el && canvasRef.current) {
                                    // Get the generic offset of the element within the canvas
                                    // canvasRef is the transformed container. 
                                    // el.offsetTop should give position relative to canvasRef (since canvasRef is the parent flex-col)

                                    // Calculate center of the element in local space
                                    const elementCenterY = el.offsetTop + el.clientHeight / 2;

                                    // Visual Y of this center point = viewport.y + (elementCenterY * viewport.scale)
                                    // We want Visual Y = ContainerHeight / 2
                                    // So: viewport.y = (ContainerHeight / 2) - (elementCenterY * viewport.scale)

                                    const containerHeight = scrollContainerRef.current ? scrollContainerRef.current.clientHeight : window.innerHeight;
                                    const newY = (containerHeight / 2) - (elementCenterY * viewport.scale);

                                    setViewport(prev => ({
                                        ...prev,
                                        y: newY
                                    }));
                                }
                            }}
                            className={cn(
                                "group relative w-16 h-20 rounded-xl overflow-hidden border transition-all shrink-0 bg-surface shadow-lg",
                                activeImageId === img.id ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0a] scale-110 z-10" : "border-white/10 hover:border-primary"
                            )}
                        >
                            <img
                                src={img.preview}
                                alt={`Thumb ${idx + 1}`}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 flex items-center justify-center pointer-events-none">
                                <span className="text-[8px] font-black text-white/50 group-hover:text-primary">{idx + 1}</span>
                            </div>
                            {/* Hover Highlight */}
                            <div className="absolute inset-0 ring-2 ring-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </button>
                    ))
                }
            </div >

            {/* Main Canvas Area */}
            <div
                className={cn(
                    "flex-1 relative bg-black/80 overflow-y-auto overflow-x-hidden md:overflow-hidden flex flex-col cursor-crosshair transition-all duration-500",
                    isPreviewMode ? "z-[200]" : ""
                )}
                style={{
                    touchAction: (typeof window !== 'undefined' && window.innerWidth < 768)
                        ? (isDrawingActive ? 'none' : 'pan-y')
                        : 'none',
                    backgroundColor: isPreviewMode ? '#000' : 'rgba(0,0,0,0.8)'
                }}
            >
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "flex-1 p-0 md:overflow-hidden md:touch-none",
                        isSpacePressed ? "cursor-grab" : "",
                        isPanning ? "cursor-grabbing" : "",
                        (isPreviewMode || (typeof window !== 'undefined' && window.innerWidth < 768)) ? "overflow-y-auto overflow-x-hidden h-full" : ""
                    )}
                    style={isPreviewMode ? { transform: 'none' } : {}}
                    onMouseDown={(e) => {
                        if (isPreviewMode) return; // Preview горимд panning-ыг идэвхгүй болгох
                        if (isSpacePressed || e.button === 1) { // Space or Middle Click
                            setIsPanning(true);
                            panStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                viewX: viewport.x,
                                viewY: viewport.y
                            };
                            e.preventDefault();
                        }
                    }}
                    onMouseMove={(e) => {
                        if (isPanning) {
                            const dx = e.clientX - panStart.current.x;
                            const dy = e.clientY - panStart.current.y;
                            setViewport(prev => ({
                                ...prev,
                                x: panStart.current.viewX + dx,
                                y: panStart.current.viewY + dy
                            }));
                        }
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                    onTouchStart={(e) => {
                        // Allow native scroll on mobile IF not using a drawing tool
                        const isDrawing = isEraserActive || isRectToolActive || isGradientActive || isBlendActive || isPatchActive || isInpaintActive || isContextAwareActive;
                        if (window.innerWidth < 768 && !isDrawing) return;

                        // Disable zoom/pinch while drawing on mobile
                        if (window.innerWidth < 768 && isDrawing) {
                            if (e.cancelable) e.preventDefault();
                            return;
                        }

                        if (e.touches.length === 2) {
                            // Pinch to zoom
                            const touch1 = e.touches[0];
                            const touch2 = e.touches[1];
                            const distance = Math.hypot(
                                touch2.clientX - touch1.clientX,
                                touch2.clientY - touch1.clientY
                            );
                            touchStartDistance.current = distance;
                            touchStartScale.current = viewport.scale;

                            const centerX = (touch1.clientX + touch2.clientX) / 2;
                            const centerY = (touch1.clientY + touch2.clientY) / 2;
                            lastTouchCenter.current = { x: centerX, y: centerY };
                        } else if (e.touches.length === 1) {
                            // Single finger pan
                            const touch = e.touches[0];
                            panStart.current = {
                                x: touch.clientX,
                                y: touch.clientY,
                                viewX: viewport.x,
                                viewY: viewport.y
                            };
                            setIsPanning(true);
                        }
                    }}
                    onTouchMove={(e) => {
                        // Allow native scroll on mobile IF not using a drawing tool
                        const isDrawing = isEraserActive || isRectToolActive || isGradientActive || isBlendActive || isPatchActive || isInpaintActive || isContextAwareActive;
                        if (window.innerWidth < 768 && !isDrawing) return;
                        if (e.touches.length === 2) {
                            // Pinch to zoom
                            e.preventDefault();
                            const touch1 = e.touches[0];
                            const touch2 = e.touches[1];
                            const distance = Math.hypot(
                                touch2.clientX - touch1.clientX,
                                touch2.clientY - touch1.clientY
                            );

                            const scale = (distance / touchStartDistance.current) * touchStartScale.current;
                            const newScale = Math.max(0.1, Math.min(10, scale));

                            const centerX = (touch1.clientX + touch2.clientX) / 2;
                            const centerY = (touch1.clientY + touch2.clientY) / 2;

                            const container = scrollContainerRef.current;
                            if (container) {
                                const rect = container.getBoundingClientRect();
                                const mouseX = centerX - rect.left;
                                const mouseY = centerY - rect.top;

                                const scaleFactor = newScale / viewport.scale;

                                setViewport({
                                    scale: newScale,
                                    x: mouseX - (mouseX - viewport.x) * scaleFactor,
                                    y: mouseY - (mouseY - viewport.y) * scaleFactor
                                });
                            }
                        } else if (e.touches.length === 1 && isPanning) {
                            // Single finger pan
                            const touch = e.touches[0];
                            const dx = touch.clientX - panStart.current.x;
                            const dy = touch.clientY - panStart.current.y;
                            setViewport(prev => ({
                                ...prev,
                                x: panStart.current.viewX + dx,
                                y: panStart.current.viewY + dy
                            }));
                        }
                    }}
                    onTouchEnd={() => {
                        setIsPanning(false);
                        touchStartDistance.current = 0;
                    }}
                >
                    <div
                        ref={canvasRef}
                        className={cn(
                            "origin-top-left transition-transform duration-75 ease-out will-change-transform backface-visibility-hidden",
                            isSplitView ? "grid grid-cols-2 gap-8 w-[1600px] items-center p-8 md:p-20" : "flex flex-col items-center gap-0 w-full md:w-[1000px] max-w-none p-0 md:py-20"
                        )}
                        style={{
                            transform: isPreviewMode
                                ? 'none'
                                : (typeof window !== 'undefined' && window.innerWidth < 768)
                                    ? `translate3d(${viewport.x}px, 0px, 0) scale(${viewport.scale})`
                                    : `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
                            transformOrigin: '0 0',
                            backfaceVisibility: 'hidden',
                            width: isPreviewMode || (typeof window !== 'undefined' && window.innerWidth < 768) ? '100%' : (isSplitView ? '1600px' : '1000px')
                        }}
                    >
                        {isSplitView && (
                            <div className="flex flex-col items-center gap-0 border-r border-white/10 pr-4 w-full">
                                <div className="text-[10px] font-black uppercase text-muted tracking-widest bg-black/50 px-3 py-1 rounded-full mb-[-20px] z-10">Original</div>
                                {images.map((img, idx) => (
                                    <div key={`orig-${img.id}`} className="relative opacity-60 hover:opacity-100 transition-opacity w-full">
                                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md">PAGE {idx + 1}</div>
                                        <img src={baseImagesRef.current[img.id] || img.cleanUrl || img.preview} className="w-full h-auto pointer-events-none select-none" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* RIGHT COLUMN: EDITOR */}
                        <div className={cn("flex flex-col items-center gap-0", isSplitView ? "border-l border-white/5 pl-4 w-full" : "w-full")}>
                            {isSplitView && <div className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-3 py-1 rounded-full mb-[-20px] z-10">Editor</div>}
                            {images.map((img, idx) => (
                                <div key={img.id} id={`page-${img.id}`} className={cn(
                                    "relative bg-surface group transition-all duration-300",
                                    isSplitView || isPreviewMode || (typeof window !== 'undefined' && window.innerWidth < 768) ? "w-full" : "max-w-[800px]"
                                )}>
                                    {/* Page Indicator */}
                                    {(() => { const isActivePage = activeChapter?.images[0]?.id === img.id || editingId ? true : false; return null; })()}
                                    {/* Actually, guides are global state, but rendered per page? 
                                        Wait, 'guides' state is single array. 
                                        If I have multiple pages, where do guides show? 
                                        The logic in handleDrag uses 'activeChapter.images[0]' to find imgEl... which is fragile for multi-page.
                                        But for now let's assume single page editing or strict active page. 
                                        Let's just show guides on all pages? No.
                                        The guide coord is %, so it works on any page container if applicable.
                                        But dragging happens on specific object.
                                        Let's just render it. The parent 'div' has `relative`.
                                     */}
                                    {!isPreviewMode && (
                                        <div className="absolute -left-20 top-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[10px] font-black text-muted transition-all group-hover:bg-primary group-hover:text-white">
                                            {idx + 1}
                                        </div>
                                    )}

                                    {layerSettings.original.visible && (
                                        <img
                                            id={`img-el-${img.id}`}
                                            // FIX: Always use Clean / Base image for Editor background
                                            src={baseImagesRef.current[img.id] || img.cleanUrl || img.preview}
                                            alt={`Page ${idx + 1}`}
                                            className={cn(
                                                "w-full h-auto pointer-events-none select-none",
                                                isEraserActive && "cursor-crosshair" // Visual only, wrapper catches events
                                            )}
                                        />
                                    )}

                                    {/* Objects Layer for this specific page - Moved up to be on top of drawings */}
                                    {layerSettings.text.visible && (
                                        <div className={cn("absolute inset-0 z-20", layerSettings.text.locked && "pointer-events-none")}>
                                            {(() => {
                                                const imgElement = typeof document !== 'undefined' ? document.getElementById(`img-el-${img.id}`) as HTMLImageElement : null;
                                                const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;
                                                const invScale = 1 / naturalScale;

                                                return objects.filter(o => o.imageId === img.id).map((obj) => (
                                                    <div
                                                        id={`bubble-${obj.id}`}
                                                        key={obj.id}
                                                        onMouseDown={(e) => {
                                                            const now = Date.now();
                                                            if (lastTap.current?.id === obj.id && (now - lastTap.current.time) < 500) {
                                                                // Double tap detected
                                                                if (window.innerWidth < 768) {
                                                                    setEditingId(obj.id);
                                                                    setTimeout(() => {
                                                                        const el = document.getElementById(`canvas-input-${obj.id}`);
                                                                        el?.focus();
                                                                    }, 100);
                                                                }
                                                            }
                                                            lastTap.current = { id: obj.id, time: now };
                                                            setSelectedId(obj.id);
                                                            handleDrag(obj.id, e);
                                                        }}
                                                        onTouchStart={(e) => {
                                                            if (e.cancelable) e.preventDefault();
                                                            e.stopPropagation();

                                                            const now = Date.now();
                                                            if (lastTap.current?.id === obj.id && (now - lastTap.current.time) < 500) {
                                                                // Double tap detected
                                                                if (window.innerWidth < 768) {
                                                                    setEditingId(obj.id);
                                                                    setTimeout(() => {
                                                                        const el = document.getElementById(`canvas-input-${obj.id}`);
                                                                        el?.focus();
                                                                    }, 100);
                                                                }
                                                            }
                                                            lastTap.current = { id: obj.id, time: now };
                                                            setSelectedId(obj.id);
                                                            handleDrag(obj.id, e);
                                                        }}
                                                        className={cn(
                                                            "absolute cursor-move select-none group/bubble",
                                                            selectedId === obj.id ? "ring-1 ring-white/60 z-50 shadow-[0_0_15px_rgba(0,0,0,0.3)]" : "hover:ring-1 hover:ring-white/20"
                                                        )}
                                                        style={{
                                                            left: `${obj.x * invScale}px`,
                                                            top: `${obj.y * invScale}px`,
                                                            width: `${obj.width * invScale}px`,
                                                            height: obj.height ? `${obj.height * invScale}px` : undefined,
                                                            display: obj.height ? 'flex' : 'block',
                                                            flexDirection: 'column',
                                                            touchAction: 'none',
                                                            transform: `rotate(${obj.rotation}deg)`,
                                                            transformOrigin: 'center center'
                                                        }}
                                                    >
                                                        {/* Handles - Always visible when selected */}
                                                        {selectedId === obj.id && !isEraserActive && !layerSettings.text.locked && window.innerWidth >= 768 && (
                                                            <>
                                                                {/* Resize Handles */}
                                                                <div
                                                                    className="absolute top-0 bottom-0 -right-1.5 w-3 cursor-ew-resize group/h-right z-[60] flex items-center justify-center"
                                                                    onMouseDown={(e) => handleResize(obj.id, 'right', e)}
                                                                    onTouchStart={(e) => handleResize(obj.id, 'right', e)}
                                                                >
                                                                    <div className="w-1.5 h-6 bg-white rounded-full shadow-lg border border-black/10 opacity-80 group-hover/h-right:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div
                                                                    className="absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize group/h-left z-[60] flex items-center justify-center"
                                                                    onMouseDown={(e) => handleResize(obj.id, 'left', e)}
                                                                    onTouchStart={(e) => handleResize(obj.id, 'left', e)}
                                                                >
                                                                    <div className="w-1.5 h-6 bg-white rounded-full shadow-lg border border-black/10 opacity-80 group-hover/h-left:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div
                                                                    className="absolute -bottom-2 -right-2 w-7 h-7 cursor-nwse-resize z-[60] flex items-center justify-center"
                                                                    onMouseDown={(e) => handleResize(obj.id, 'bottom-right', e)}
                                                                    onTouchStart={(e) => handleResize(obj.id, 'bottom-right', e)}
                                                                >
                                                                    <div className="w-4 h-4 bg-white rounded-full border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] ring-1 ring-black/5" />
                                                                </div>

                                                                {/* Rotation Handle (Bottom) */}
                                                                <div
                                                                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-8 h-8 z-[60] flex items-center justify-center cursor-grab active:cursor-grabbing group/rotate"
                                                                    onMouseDown={(e) => handleRotate(obj.id, e)}
                                                                    onTouchStart={(e) => handleRotate(obj.id, e)}
                                                                >
                                                                    <div className="w-[1px] h-8 bg-white/50 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full" />
                                                                    <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] border-2 border-primary group-hover/rotate:scale-125 transition-transform" />
                                                                </div>

                                                                {/* Floating Buttons - Hidden while rotating */}
                                                                {rotatingId !== obj.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                                                                        exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
                                                                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                                                        className="absolute -top-24 left-1/2 flex items-center gap-2 bg-black/85 backdrop-blur-2xl border border-white/10 p-3 rounded-full shadow-[0_12px_48px_rgba(0,0,0,0.6)] z-[100]"
                                                                        style={{ transform: `rotate(${-obj.rotation}deg)` }}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        onTouchStart={(e) => e.stopPropagation()}
                                                                    >
                                                                        {/* AI Quick Actions (Phase 3) */}
                                                                        <div className="flex items-center gap-1.5 bg-primary/10 rounded-full p-1 border border-primary/20 mr-1.5">
                                                                            {/* Style Painter Logic */}
                                                                            <button
                                                                                onMouseDown={(e) => { e.stopPropagation(); stylePainterRef.current?.copyStyle(obj.id); }}
                                                                                className="p-2.5 hover:bg-primary/20 text-primary/60 hover:text-primary rounded-full transition-colors group relative"
                                                                                title="Copy Style"
                                                                            >
                                                                                <Clipboard className="w-5 h-5" />
                                                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-bold uppercase tracking-widest">Copy Style</div>
                                                                            </button>

                                                                            {stylePainterRef.current?.hasCopiedStyle && (
                                                                                <button
                                                                                    onMouseDown={(e) => { e.stopPropagation(); stylePainterRef.current?.applyStyle(obj.id); }}
                                                                                    className="p-2.5 bg-primary text-white rounded-full transition-all hover:scale-110 active:scale-90 group relative shadow-[0_0_15px_rgba(var(--primary),0.4)]"
                                                                                    title="Paste Style"
                                                                                >
                                                                                    <Paintbrush className="w-5 h-5" />
                                                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-bold uppercase tracking-widest">Paste Style</div>
                                                                                </button>
                                                                            )}

                                                                            <div className="w-[1px] h-5 bg-white/10 mx-1.5" />

                                                                            {window.innerWidth < 768 && (
                                                                                <button
                                                                                    onMouseDown={(e) => { e.stopPropagation(); setEditingId(obj.id); }}
                                                                                    className="p-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-all"
                                                                                    title="Edit Text"
                                                                                >
                                                                                    <Type className="w-5 h-5" />
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onMouseDown={(e) => { e.stopPropagation(); handleAutoFit(); }}
                                                                                className="p-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-all group relative"
                                                                                title="AI Auto Fit"
                                                                            >
                                                                                <Sparkles className="w-5 h-5" />
                                                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-bold">AI Auto-fit</div>
                                                                            </button>
                                                                            <div className="w-[1px] h-5 bg-primary/20 mx-0.5" />
                                                                            <button
                                                                                className="p-2.5 hover:bg-primary/20 text-primary/60 hover:text-primary rounded-full transition-colors"
                                                                                title="AI Edit (Coming Soon)"
                                                                            >
                                                                                <Languages className="w-5 h-5" />
                                                                            </button>
                                                                        </div>

                                                                        <button
                                                                            onMouseDown={() => updateObject(obj.id, { fontSize: Math.max(8, obj.fontSize - 2) })}
                                                                            className="p-2.5 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors"
                                                                        >
                                                                            <Minus className="w-5 h-5" />
                                                                        </button>
                                                                        <span className="text-sm font-black text-white min-w-[32px] text-center select-none tabular-nums tracking-tighter">{Math.round(obj.fontSize * invScale)}</span>
                                                                        <button
                                                                            onMouseDown={() => updateObject(obj.id, { fontSize: Math.min(200, obj.fontSize + 2) })}
                                                                            className="p-2.5 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors"
                                                                        >
                                                                            <Plus className="w-5 h-5" />
                                                                        </button>

                                                                        <div className="w-[1px] h-5 bg-white/10 mx-1.5" />

                                                                        <button
                                                                            onMouseDown={() => updateObject(obj.id, { fontWeight: obj.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                                                            className={cn("p-2.5 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors", obj.fontWeight === 'bold' && "text-white bg-white/10")}
                                                                        >
                                                                            <Bold className="w-5 h-5" />
                                                                        </button>

                                                                        <button
                                                                            onMouseDown={() => updateObject(obj.id, { rotation: obj.rotation === 90 ? 0 : 90 })}
                                                                            className={cn("p-2.5 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors", obj.rotation === 90 && "text-white bg-white/10")}
                                                                            title="Rotate 90°"
                                                                        >
                                                                            <RotateCw className="w-5 h-5" />
                                                                        </button>

                                                                        <button
                                                                            onMouseDown={() => updateObject(obj.id, { color: (obj.color === '#000000' || obj.color === 'black') ? '#ffffff' : '#000000' })}
                                                                            className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
                                                                        >
                                                                            <div className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: obj.color }} />
                                                                        </button>

                                                                        <div className="w-[1px] h-5 bg-white/10 mx-1.5" />

                                                                        <button
                                                                            onMouseDown={() => deleteObject(obj.id)}
                                                                            className="p-2.5 hover:bg-red-500/20 rounded-full text-muted hover:text-red-500 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>

                                                                        <button onMouseDown={() => setSelectedId(null)} className="p-2.5 hover:bg-primary/20 rounded-full text-muted hover:text-primary transition-colors">
                                                                            <Check className="w-5 h-5" />
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </>
                                                        )}
                                                        {showTextNumbers && activeTab === 'translate' && (
                                                            <div
                                                                className="absolute -top-3 -left-3 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg z-50 ring-2 ring-surface border border-white/20 group-hover/bubble:scale-110 transition-transform cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedId(obj.id);
                                                                    setActiveTab('translate');

                                                                    // Double tap detected
                                                                    if (window.innerWidth < 768) {
                                                                        setEditingId(obj.id);
                                                                        /* 
                                                                        setIsMobileScriptOpen(true);
                                                                        setTimeout(() => {
                                                                            const el = document.getElementById(`mobile-input-${obj.id}`);
                                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            el?.focus();
                                                                        }, 100);
                                                                        */
                                                                    }
                                                                    if (window.innerWidth >= 768) {
                                                                        // Desktop: scroll script panel to the input
                                                                        setTimeout(() => {
                                                                            const el = document.getElementById(`textarea-${obj.id}`);
                                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            el?.focus();
                                                                        }, 100);
                                                                    }
                                                                }}
                                                                onTouchStart={(e) => e.stopPropagation()}
                                                            >
                                                                {sortedObjects.findIndex(o => o.id === obj.id) + 1}
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                fontFamily: obj.fontFamily,
                                                                fontSize: `${obj.fontSize * invScale}px`,
                                                                color: obj.color, // Keeps text flow correct, inner span overrides if gradient
                                                                fontWeight: obj.fontWeight,
                                                                fontStyle: obj.fontStyle,
                                                                textDecoration: obj.textDecoration || 'none',
                                                                textAlign: obj.textAlign,
                                                                // Background Gradient moved to inner span
                                                                WebkitTextStroke: `${(obj.strokeWidth || 0) * invScale}px ${obj.strokeColor}`,
                                                                textShadow: `
                                                                    ${obj.shadowBlur ? `${obj.shadowOffsetX || 0}px ${obj.shadowOffsetY || 0}px ${obj.shadowBlur}px ${obj.shadowColor}${Math.round((obj.shadowOpacity || 1) * 255).toString(16).padStart(2, '0')}` : ''}
                                                                    ${obj.glowBlur ? `${obj.shadowBlur ? ',' : ''} 0 0 ${obj.glowBlur}px ${obj.glowColor}${Math.round((obj.glowOpacity || 1) * 255).toString(16).padStart(2, '0')}` : ''}
                                                                `.trim(),
                                                                lineHeight: obj.lineHeight,
                                                                letterSpacing: `${(obj.letterSpacing || 0) * invScale}px`,
                                                                opacity: obj.opacity,
                                                                transform: `rotate(${obj.rotation}deg)`,
                                                                backgroundColor: obj.backgroundColor !== 'transparent'
                                                                    ? `${obj.backgroundColor}${Math.round((obj.bgOpacity ?? 1) * 255).toString(16).padStart(2, '0')}`
                                                                    : 'transparent',
                                                                padding: obj.backgroundColor !== 'transparent'
                                                                    ? `${(obj.bgPaddingY ?? 10) * invScale}px ${(obj.bgPaddingX ?? 10) * invScale}px`
                                                                    : '0',
                                                                borderRadius: `${(obj.bgBorderRadius ?? 8) * invScale}px`,
                                                                paintOrder: 'stroke fill',
                                                                width: '100%',
                                                                height: obj.height ? '100%' : 'auto',
                                                                display: obj.height ? 'flex' : 'block',
                                                                alignItems: obj.height ? 'center' : undefined,
                                                                justifyContent: obj.height
                                                                    ? (obj.textAlign === 'center' ? 'center' : (obj.textAlign === 'right' ? 'flex-end' : 'flex-start'))
                                                                    : undefined
                                                            }}
                                                            className="whitespace-pre-wrap break-words leading-tight"
                                                        >
                                                            {selectedId === obj.id && editingId === obj.id && window.innerWidth < 768 ? (
                                                                <textarea
                                                                    id={`canvas-input-${obj.id}`}
                                                                    value={obj.text}
                                                                    onChange={(e) => updateObject(obj.id, { text: e.target.value })}
                                                                    onBlur={() => setEditingId(null)}
                                                                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 m-0"
                                                                    style={{
                                                                        fontFamily: 'inherit',
                                                                        fontSize: 'inherit',
                                                                        fontWeight: 'inherit',
                                                                        color: 'inherit',
                                                                        textAlign: 'inherit',
                                                                        lineHeight: 'inherit',
                                                                        WebkitTextFillColor: 'initial', // Reset for gradient compatibility
                                                                        height: 'auto'
                                                                    }}
                                                                    rows={obj.text.split('\n').length || 1}
                                                                    autoFocus
                                                                    onInput={(e) => {
                                                                        const target = e.target as HTMLTextAreaElement;
                                                                        target.style.height = 'auto';
                                                                        target.style.height = `${target.scrollHeight}px`;
                                                                    }}
                                                                    onFocus={(e) => {
                                                                        const target = e.target as HTMLTextAreaElement;
                                                                        target.style.height = 'auto';
                                                                        target.style.height = `${target.scrollHeight}px`;
                                                                    }}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    onTouchStart={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        backgroundImage: obj.gradientEnabled
                                                                            ? `linear-gradient(${obj.gradientAngle || 180}deg, ${obj.color}, ${obj.color2 || obj.color})`
                                                                            : undefined,
                                                                        backgroundClip: obj.gradientEnabled ? 'text' : undefined,
                                                                        WebkitBackgroundClip: obj.gradientEnabled ? 'text' : undefined,
                                                                        WebkitTextFillColor: obj.gradientEnabled ? 'transparent' : undefined,
                                                                        // Ensure color is inherited or overridden for non-gradient
                                                                        color: obj.gradientEnabled ? 'transparent' : obj.color,
                                                                        boxDecorationBreak: 'clone',
                                                                        WebkitBoxDecorationBreak: 'clone'
                                                                    }}
                                                                >
                                                                    {obj.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}

                                    {layerSettings.drawings.visible && (
                                        (() => {
                                            const imgElement = typeof document !== 'undefined' ? document.getElementById(`img-el-${img.id}`) as HTMLImageElement : null;
                                            const naturalScale = imgElement ? (imgElement.naturalWidth / imgElement.clientWidth) : 1;
                                            const invScale = 1 / naturalScale;

                                            return (
                                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                                    <g transform={`scale(${invScale})`} style={{ transformOrigin: 'top left' }}>
                                                        {drawings.filter(d => d.imageId === img.id).map(d => (
                                                            <Fragment key={d.id}>
                                                                {d.type === 'gradient' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined && (
                                                                    <>
                                                                        <defs>
                                                                            <linearGradient id={`grad-simple-${d.id}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} gradientUnits="userSpaceOnUse">
                                                                                <stop offset="0%" stopColor={d.color} />
                                                                                <stop offset="100%" stopColor={d.color2 || d.color} />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        {d.pathData ? (
                                                                            <path
                                                                                d={d.pathData}
                                                                                fill={`url(#grad-simple-${d.id})`}
                                                                                className="pointer-events-auto cursor-pointer"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                            />
                                                                        ) : (
                                                                            <rect
                                                                                x={Math.min(d.x1, d.x2)}
                                                                                y={Math.min(d.y1, d.y2)}
                                                                                width={Math.abs(d.x2 - d.x1)}
                                                                                height={Math.abs(d.y2 - d.y1)}
                                                                                fill={`url(#grad-simple-${d.id})`}
                                                                                className="pointer-events-auto cursor-pointer"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                            />
                                                                        )}
                                                                    </>
                                                                )}
                                                                {d.type === 'patch' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined && (
                                                                    <>
                                                                        {/* The Cloned Content */}
                                                                        {d.resultImage ? (
                                                                            <image
                                                                                href={d.resultImage}
                                                                                x={d.x1}
                                                                                y={d.y1}
                                                                                width={d.x2 - d.x1}
                                                                                height={d.y2 - d.y1}
                                                                                preserveAspectRatio="none"
                                                                                className="pointer-events-auto cursor-pointer"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                            />
                                                                        ) : (
                                                                            <svg
                                                                                x={d.x1} y={d.y1}
                                                                                width={d.x2 - d.x1} height={d.y2 - d.y1}
                                                                                viewBox={`${d.x1 + (d.sx || 0)} ${d.y1 + (d.sy || 0)} ${d.x2 - d.x1} ${d.y2 - d.y1}`}
                                                                                preserveAspectRatio="none"
                                                                                className="pointer-events-none"
                                                                            >
                                                                                <image href={img.preview} x={0} y={0} width="100%" height="auto" style={{ width: 'auto', height: 'auto' }} />
                                                                            </svg>
                                                                        )}

                                                                        <rect
                                                                            x={d.x1}
                                                                            y={d.y1}
                                                                            width={d.x2 - d.x1}
                                                                            height={d.y2 - d.y1}
                                                                            fill="none"
                                                                            stroke="#00FF00"
                                                                            strokeWidth={1}
                                                                            strokeOpacity={selectedId === d.id ? 1 : 0.2}
                                                                            className="pointer-events-auto cursor-pointer"
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                        />
                                                                        {/* Sampling Source Box (Visual Only here, handle in Layers or below) */}
                                                                        {selectedId === d.id && (
                                                                            <>
                                                                                <line
                                                                                    x1={(d.x1 + d.x2) / 2} y1={(d.y1 + d.y2) / 2}
                                                                                    x2={(d.x1 + d.x2) / 2 + (d.sx || 0)} y2={(d.y1 + d.y2) / 2 + (d.sy || 0)}
                                                                                    stroke="#00FF00" strokeWidth={2} strokeDasharray="4"
                                                                                />
                                                                                <g
                                                                                    transform={`translate(${d.x1 + (d.sx || 0)}, ${d.y1 + (d.sy || 0)})`}
                                                                                    onMouseDown={(e) => handleDrag(d.id, e)}
                                                                                    onTouchStart={(e) => handleDrag(d.id, e)}
                                                                                    className="cursor-move pointer-events-auto"
                                                                                >
                                                                                    <rect
                                                                                        width={d.x2 - d.x1} height={d.y2 - d.y1}
                                                                                        fill="rgba(0, 255, 0, 0.1)" stroke="#00FF00"
                                                                                        strokeWidth={2} strokeDasharray="2"
                                                                                    />
                                                                                    <circle cx={(d.x2 - d.x1) / 2} cy={(d.y2 - d.y1) / 2} r={10} fill="#00FF00" />
                                                                                    <Move className="w-4 h-4 text-white" style={{ transform: `translate(${(d.x2 - d.x1) / 2 - 8}px, ${(d.y2 - d.y1) / 2 - 8}px)` }} />
                                                                                </g>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {d.type === 'inpaint' && d.x1 !== undefined && d.x2 !== undefined && d.y1 !== undefined && d.y2 !== undefined && (
                                                                    <>
                                                                        {d.resultImage ? (
                                                                            <image
                                                                                href={d.resultImage}
                                                                                x={d.x1}
                                                                                y={d.y1}
                                                                                width={d.x2 - d.x1}
                                                                                height={d.y2 - d.y1}
                                                                                preserveAspectRatio="none"
                                                                                className="pointer-events-auto cursor-pointer"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                            />
                                                                        ) : (
                                                                            <rect
                                                                                x={d.x1}
                                                                                y={d.y1}
                                                                                width={d.x2 - d.x1}
                                                                                height={d.y2 - d.y1}
                                                                                fill="rgba(150, 100, 255, 0.1)"
                                                                                stroke="#AF52DE"
                                                                                strokeWidth={1}
                                                                                strokeDasharray="2"
                                                                                className="pointer-events-auto cursor-pointer"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                            />
                                                                        )}
                                                                    </>
                                                                )}
                                                                {d.pathData ? (
                                                                    <path
                                                                        d={d.pathData}
                                                                        fill={d.color}
                                                                        stroke="none"
                                                                        className="pointer-events-auto cursor-pointer"
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                                                                    />
                                                                ) : (d.points && d.points.length > 0 && !d.type) ? (
                                                                    <polyline
                                                                        points={d.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                        fill={d.isFill ? d.color : "none"}
                                                                        stroke={d.isFill ? "none" : d.color}
                                                                        strokeWidth={d.isFill ? 0 : d.strokeWidth}
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        className="pointer-events-none"
                                                                    />
                                                                ) : (d.type === 'blend' && d.points && d.points.length > 0) ? (
                                                                    d.resultImage ? (
                                                                        <image
                                                                            href={d.resultImage}
                                                                            x={d.x1}
                                                                            y={d.y1}
                                                                            width={(d.x2 || 0) - (d.x1 || 0)}
                                                                            height={(d.y2 || 0) - (d.y1 || 0)}
                                                                            preserveAspectRatio="none"
                                                                            className="pointer-events-none"
                                                                        />
                                                                    ) : (
                                                                        <polyline
                                                                            points={d.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                            fill="none"
                                                                            stroke="rgba(255,255,255,0.3)"
                                                                            strokeWidth={d.blendSize || 30}
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            className="pointer-events-none"
                                                                        />
                                                                    )
                                                                ) : null}
                                                            </Fragment>
                                                        ))}
                                                        {currentRect && currentRect.imageId === img.id && (
                                                            <rect
                                                                x={Math.min(currentRect.startX, currentRect.endX)}
                                                                y={Math.min(currentRect.startY, currentRect.endY)}
                                                                width={Math.abs(currentRect.endX - currentRect.startX)}
                                                                height={Math.abs(currentRect.endY - currentRect.startY)}
                                                                fill={currentRect.color || "rgba(0, 149, 246, 0.2)"}
                                                                stroke="#0095F6"
                                                                strokeWidth={2}
                                                                strokeDasharray="4"
                                                                opacity={1}
                                                            />
                                                        )}
                                                        {currentInpaint && currentInpaint.imageId === img.id && (
                                                            <rect
                                                                x={Math.min(currentInpaint.x1, currentInpaint.x2)}
                                                                y={Math.min(currentInpaint.y1, currentInpaint.y2)}
                                                                width={Math.abs(currentInpaint.x2 - currentInpaint.x1)}
                                                                height={Math.abs(currentInpaint.y2 - currentInpaint.y1)}
                                                                fill="rgba(150, 100, 255, 0.2)"
                                                                stroke="#AF52DE"
                                                                strokeWidth={2}
                                                                strokeDasharray="4"
                                                                opacity={1}
                                                            />
                                                        )}
                                                        {currentContextAware && currentContextAware.imageId === img.id && (
                                                            <rect
                                                                x={Math.min(currentContextAware.x1, currentContextAware.x2)}
                                                                y={Math.min(currentContextAware.y1, currentContextAware.y2)}
                                                                width={Math.abs(currentContextAware.x2 - currentContextAware.x1)}
                                                                height={Math.abs(currentContextAware.y2 - currentContextAware.y1)}
                                                                fill="rgba(147, 51, 234, 0.2)"
                                                                stroke="#9333ea"
                                                                strokeWidth={2}
                                                                strokeDasharray="4"
                                                                opacity={1}
                                                            />
                                                        )}
                                                        {currentPatch && currentPatch.imageId === img.id && (
                                                            <rect
                                                                x={Math.min(currentPatch.x1, currentPatch.x2)}
                                                                y={Math.min(currentPatch.y1, currentPatch.y2)}
                                                                width={Math.abs(currentPatch.x2 - currentPatch.x1)}
                                                                height={Math.abs(currentPatch.y2 - currentPatch.y1)}
                                                                fill="rgba(0, 255, 0, 0.2)"
                                                                stroke="#00FF00"
                                                                strokeWidth={2}
                                                                strokeDasharray="4"
                                                                opacity={1}
                                                            />
                                                        )}
                                                        {currentGradient && currentGradient.imageId === img.id && (
                                                            <>
                                                                <defs>
                                                                    <linearGradient id="current-grad-preview" x1={currentGradient.x1} y1={currentGradient.y1} x2={currentGradient.x2} y2={currentGradient.y2} gradientUnits="userSpaceOnUse">
                                                                        <stop offset="0%" stopColor={currentGradient.color1} />
                                                                        <stop offset="100%" stopColor={currentGradient.color2} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <rect
                                                                    x={Math.min(currentGradient.x1, currentGradient.x2)}
                                                                    y={Math.min(currentGradient.y1, currentGradient.y2)}
                                                                    width={Math.abs(currentGradient.x2 - currentGradient.x1)}
                                                                    height={Math.abs(currentGradient.y2 - currentGradient.y1)}
                                                                    fill="url(#current-grad-preview)"
                                                                    stroke="#FFFFFF"
                                                                    strokeWidth={1}
                                                                    opacity={0.8}
                                                                />
                                                                <line
                                                                    x1={currentGradient.x1} y1={currentGradient.y1}
                                                                    x2={currentGradient.x2} y2={currentGradient.y2}
                                                                    stroke="#FFFFFF" strokeWidth={2} strokeDasharray="4"
                                                                />
                                                            </>
                                                        )}
                                                        {currentBlendPath && currentBlendPath.imageId === img.id && currentBlendPath.points.length > 0 && (
                                                            <polyline
                                                                points={currentBlendPath.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                fill="none"
                                                                stroke="rgba(100,200,255,0.6)"
                                                                strokeWidth={blendSize}
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        )}
                                                        {currentCrop && currentCrop.imageId === img.id && (
                                                            <rect
                                                                x={Math.min(currentCrop.startX, currentCrop.endX)}
                                                                y={Math.min(currentCrop.startY, currentCrop.endY)}
                                                                width={Math.abs(currentCrop.endX - currentCrop.startX)}
                                                                height={Math.abs(currentCrop.endY - currentCrop.startY)}
                                                                fill="none"
                                                                stroke="#0095F6"
                                                                strokeWidth={2 / viewport.scale}
                                                                strokeDasharray="4"
                                                            />
                                                        )}
                                                    </g>
                                                </svg>
                                            );
                                        })()
                                    )}

                                    {/* Event Catcher for Drawing, Text Placement & Magic Wand */}
                                    {(isEraserActive || isTextToolActive || isMagicWandActive || isRectToolActive || isGradientActive || isBlendActive || isCropActive || isPatchActive || isInpaintActive || isContextAwareActive) && (
                                        <div
                                            className={cn(
                                                "absolute inset-0 z-30",
                                                // Allow default touch actions (scrolling) initially.
                                                // We prevent them dynamically if Drawing Mode activates.
                                                (isEraserActive || isRectToolActive || isGradientActive || isBlendActive || isCropActive || isPatchActive || isInpaintActive || isContextAwareActive) ? "cursor-crosshair" : (isMagicWandActive ? "cursor-auto" : "cursor-text")
                                            )}
                                            style={{
                                                touchAction: isDrawingActive ? 'none' : 'auto'
                                            }}
                                            onClick={(e) => {
                                                if (isMagicWandActive) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const imgEl = document.getElementById(`img-el-${img.id}`) as HTMLImageElement;

                                                    if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
                                                        // Calculate actual image display area (handling object-fit: contain letterboxing)
                                                        const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
                                                        const containerRatio = rect.width / rect.height;

                                                        let drawWidth = rect.width;
                                                        let drawHeight = rect.height;
                                                        let offsetX = 0;
                                                        let offsetY = 0;

                                                        if (containerRatio > imgRatio) {
                                                            // Container is wider -> Pillarboxing (sides empty)
                                                            drawWidth = rect.height * imgRatio;
                                                            offsetX = (rect.width - drawWidth) / 2;
                                                        } else {
                                                            // Container is taller -> Letterboxing (top/bottom empty)
                                                            drawHeight = rect.width / imgRatio;
                                                            offsetY = (rect.height - drawHeight) / 2;
                                                        }

                                                        const clickX = e.clientX - rect.left;
                                                        const clickY = e.clientY - rect.top;

                                                        // Check if click is inside the actual image
                                                        if (clickX >= offsetX && clickX <= offsetX + drawWidth &&
                                                            clickY >= offsetY && clickY <= offsetY + drawHeight) {

                                                            const relX = (clickX - offsetX) / drawWidth;
                                                            const relY = (clickY - offsetY) / drawHeight;
                                                            handleMagicWand(img.id, relX, relY);
                                                        }
                                                    } else {
                                                        // Fallback if image not loaded yet
                                                        const relX = (e.clientX - rect.left) / rect.width;
                                                        const relY = (e.clientY - rect.top) / rect.height;
                                                        handleMagicWand(img.id, relX, relY);
                                                    }
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const imgEl = document.getElementById(`img-el-${img.id}`) as HTMLImageElement;
                                                const naturalScale = imgEl ? (imgEl.naturalWidth / rect.width) : 1;
                                                const x = (e.clientX - rect.left) * naturalScale;
                                                const y = (e.clientY - rect.top) * naturalScale;

                                                if (isMagicWandActive) {
                                                    // Handled by onClick
                                                } else if (isTextToolActive) {
                                                    addText(img.id, x, y);
                                                } else if (isRectToolActive) {
                                                    handleRectStart(img.id, x, y);
                                                } else if (isGradientActive) {
                                                    handleGradientStart(img.id, x, y);
                                                } else if (isBlendActive) {
                                                    handleBlendStart(img.id, x, y);
                                                } else if (isPatchActive) {
                                                    handlePatchStart(img.id, x, y);
                                                } else if (isInpaintActive) {
                                                    handleInpaintStart(img.id, x, y);
                                                } else if (isContextAwareActive) {
                                                    handleContextAwareStart(img.id, x, y);
                                                } else if (isCropActive) {
                                                    handleCropStart(img.id, x, y);
                                                } else {
                                                    handleDrawingStart(img.id, x, y);
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                if (isEraserActive) handleDrawingMove(e);
                                                if (isRectToolActive) handleRectMove(e);
                                                if (isGradientActive) handleGradientMove(e);
                                                if (isBlendActive) handleBlendMove(e);
                                                if (isPatchActive) handlePatchMove(e);
                                                if (isInpaintActive) handleInpaintMove(e);
                                                if (isContextAwareActive) handleContextAwareMove(e);
                                                if (isCropActive) handleCropMove(e);
                                            }}
                                            onMouseUp={() => {
                                                if (isEraserActive) handleDrawingEnd();
                                                if (isRectToolActive) handleRectEnd();
                                                if (isGradientActive) handleGradientEnd();
                                                if (isBlendActive) handleBlendEnd();
                                                if (isPatchActive) handlePatchEnd();
                                                if (isInpaintActive) handleInpaintEnd();
                                                if (isContextAwareActive) handleContextAwareEnd();
                                                if (isCropActive) handleCropEnd();
                                            }}
                                            onMouseLeave={() => {
                                                // For mouse leave, we just end drawing
                                                if (isEraserActive) handleDrawingEnd();
                                                if (isRectToolActive) handleRectEnd();
                                                if (isGradientActive) handleGradientEnd();
                                                if (isBlendActive) handleBlendEnd();
                                                if (isPatchActive) handlePatchEnd();
                                                if (isInpaintActive) handleInpaintEnd();
                                                if (isContextAwareActive) handleContextAwareEnd();
                                                if (isCropActive) handleCropEnd();
                                            }}
                                            onTouchStart={(e) => {
                                                if (isMagicWandActive || isTextToolActive) return; // Allow scroll/tap for these

                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const imgEl = document.getElementById(`img-el-${img.id}`) as HTMLImageElement;
                                                const naturalScale = imgEl ? (imgEl.naturalWidth / rect.width) : 1;
                                                const touch = e.touches[0];
                                                const x = (touch.clientX - rect.left) * naturalScale;
                                                const y = (touch.clientY - rect.top) * naturalScale;

                                                if (isEraserActive || isRectToolActive || isGradientActive || isBlendActive || isCropActive || isPatchActive || isInpaintActive || isContextAwareActive) {
                                                    // Start Long Press Timer
                                                    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                                                    isDrawingMode.current = false;
                                                    setIsDrawingActive(false);

                                                    longPressTimer.current = setTimeout(() => {
                                                        isDrawingMode.current = true;
                                                        setIsDrawingActive(true);
                                                        // toast("Drawing Mode Active", { icon: '✏️', duration: 1500, position: 'top-center' });

                                                        // Call Start Handler with natural coords
                                                        if (isRectToolActive) handleRectStart(img.id, x, y);
                                                        else if (isGradientActive) handleGradientStart(img.id, x, y);
                                                        else if (isBlendActive) handleBlendStart(img.id, x, y);
                                                        else if (isPatchActive) handlePatchStart(img.id, x, y);
                                                        else if (isInpaintActive) handleInpaintStart(img.id, x, y);
                                                        else if (isContextAwareActive) handleContextAwareStart(img.id, x, y);
                                                        else if (isCropActive) handleCropStart(img.id, x, y);
                                                        else handleDrawingStart(img.id, x, y);
                                                    }, 200); // 0.2s hold to draw as requested by user
                                                }
                                            }}
                                            onTouchMove={(e) => {
                                                if (isMagicWandActive || isTextToolActive) return;

                                                if (isDrawingMode.current) {
                                                    // Locked in drawing mode -> Prevent Scroll & Draw
                                                    if (e.cancelable) e.preventDefault();
                                                    if (isEraserActive) handleDrawingMove(e);
                                                    if (isRectToolActive) handleRectMove(e);
                                                    if (isGradientActive) handleGradientMove(e);
                                                    if (isBlendActive) handleBlendMove(e);
                                                    if (isPatchActive) handlePatchMove(e);
                                                    if (isInpaintActive) handleInpaintMove(e);
                                                    if (isContextAwareActive) handleContextAwareMove(e);
                                                    if (isCropActive) handleCropMove(e);
                                                } else if (longPressTimer.current && touchStartPos.current) {
                                                    // Check for scroll drift
                                                    const touch = e.touches[0];
                                                    const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y);
                                                    if (dist > 10) {
                                                        // Moved too much -> It's a scroll, cancel timer
                                                        clearTimeout(longPressTimer.current);
                                                        longPressTimer.current = null;
                                                        touchStartPos.current = null;
                                                    }
                                                }
                                            }}
                                            onTouchEnd={() => {
                                                if (longPressTimer.current) {
                                                    clearTimeout(longPressTimer.current);
                                                    longPressTimer.current = null;
                                                }
                                                touchStartPos.current = null;

                                                if (isDrawingMode.current) {
                                                    isDrawingMode.current = false;
                                                    setIsDrawingActive(false);
                                                    if (isEraserActive) handleDrawingEnd();
                                                    if (isRectToolActive) handleRectEnd();
                                                    if (isGradientActive) handleGradientEnd();
                                                    if (isBlendActive) handleBlendEnd();
                                                    if (isPatchActive) handlePatchEnd();
                                                    if (isInpaintActive) handleInpaintEnd();
                                                    if (isContextAwareActive) handleContextAwareEnd();
                                                    if (isCropActive) handleCropEnd();
                                                }
                                            }}
                                        >
                                            {isMagicWandActive && (
                                                <div className="absolute inset-0 bg-primary/5 cursor-[url(https://raw.githubusercontent.com/google/material-design-icons/master/png/image/magic_button/materialicons/24dp/1x/baseline_magic_button_black_24dp.png),_auto]" />
                                            )}
                                        </div>
                                    )}

                                    {/* Add Text Button specific to Page */}
                                    <button
                                        onClick={() => addText(img.id)}
                                        className="absolute bottom-4 right-4 p-4 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md border border-primary/20 scale-90 hover:scale-100"
                                        title="Энэ хуудсанд текст нэмэх"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Bottom Control Bar */}
                    <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 items-center gap-4 px-6 py-4 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-2xl z-40">
                        <button onClick={() => setIsSplitView(!isSplitView)} className={cn("p-2 rounded-xl transition-all", isSplitView ? "bg-primary text-white" : "hover:bg-white/5 text-muted")} title="Split View (Original/Editor)"> <LayoutTemplate className="w-5 h-5" /> </button>
                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-white/5 rounded-xl text-muted"> <Minimize2 className="w-5 h-5" /> </button>
                        <span className="text-xs font-black uppercase text-muted w-16 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-white/5 rounded-xl text-muted"> <Maximize2 className="w-5 h-5" /> </button>
                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                        <button
                            onClick={handleDownload}
                            disabled={isSavingLocal}
                            className="p-2 hover:bg-white/5 rounded-xl text-muted hover:text-white transition-all"
                            title="Download Images"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                        <button
                            onClick={handleSaveLocal}
                            disabled={isSavingLocal}
                            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-xl font-black uppercase tracking-tighter hover:scale-105 transition-all text-xs disabled:opacity-50"
                        >
                            {isSavingLocal ? <CircleDashed className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSavingLocal ? 'Saving...' : 'Save Chapter'}
                        </button>
                    </div>
                </div >

            </div >

            {/* Right Sidebar: Contextual Panel (Desktop) */}
            < div className={cn("hidden md:flex w-96 bg-surface border-l border-white/5 flex-col shadow-2xl z-20 overflow-hidden transition-all duration-300", isFocusMode && "w-0 opacity-0 border-none")} >

                {/* Tabs */}
                < div className="flex bg-black/20 p-1 border-b border-white/5" >
                    <button
                        onClick={() => setActiveTab('translate')}
                        className={cn(
                            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'translate' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-white"
                        )}
                    >
                        Орчуулга (List)
                    </button>
                    <button
                        onClick={() => setActiveTab('style')}
                        className={cn(
                            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'style' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-white"
                        )}
                    >
                        Загвар (Style)
                    </button>
                    <button
                        onClick={() => setActiveTab('layers')}
                        className={cn(
                            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'layers' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-white"
                        )}
                    >
                        LAYERS
                    </button>
                </div >

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {activeTab === 'translate' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black uppercase tracking-tighter">Script</h2>
                                    <p className="text-muted text-[8px] font-bold uppercase tracking-widest">Текст экспортлох & Дугаарлах</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowTextNumbers(!showTextNumbers)}
                                        className={cn(
                                            "p-2 rounded-xl transition-all border",
                                            showTextNumbers ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted hover:bg-white/10"
                                        )}
                                        title="Дугаар харуулах"
                                    >
                                        <Hash className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={copyScript}
                                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-muted hover:text-white transition-all"
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
                                                            onClick={() => deleteObject(obj.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Image Snippet for Manual Entry */}
                                                    {
                                                        imageSnippets[obj.id] && (
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
                                                        )
                                                    }

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
                                                                        } else {
                                                                            toast.error("Хуулах текст олдсонгүй");
                                                                        }
                                                                    }}
                                                                    className="p-1 hover:bg-white/10 rounded text-white"
                                                                    title="Copy Text"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-[8px] font-black uppercase text-white/30 pt-1">Эх хувь</span>
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
                                                        onInput={(e) => {
                                                            const target = e.target as HTMLTextAreaElement;
                                                            target.style.height = 'auto';
                                                            target.style.height = `${target.scrollHeight}px`;
                                                        }}
                                                        onFocus={(e) => {
                                                            const target = e.target as HTMLTextAreaElement;
                                                            target.style.height = 'auto';
                                                            target.style.height = `${target.scrollHeight}px`;
                                                        }}
                                                        className={cn(
                                                            "w-full bg-black/40 border rounded-2xl p-4 text-sm outline-none transition-all min-h-[6rem] overflow-hidden leading-relaxed placeholder:text-white/10",
                                                            selectedId === obj.id ? "border-primary ring-1 ring-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]" : "border-white/5"
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
                        selectedObject ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                {/* Text Area */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Текст</label>
                                    <textarea
                                        value={selectedObject.text}
                                        onChange={(e) => updateObject(selectedObject!.id, { text: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:border-primary outline-none transition-all h-32 resize-none"
                                    />
                                </div>

                                {/* Sub-tab Navigation */}
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

                                {/* BASIC STYLE TAB */}
                                {styleSubTab === 'basic' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Фонт</label>
                                                <div className="flex gap-2">
                                                    {isManagingFonts && (
                                                        <button
                                                            onClick={restoreHiddenFonts}
                                                            className="text-[10px] text-primary hover:underline font-bold"
                                                        >
                                                            Restore All
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setIsManagingFonts(!isManagingFonts)}
                                                        className={cn(
                                                            "text-[10px] uppercase font-bold transition-colors",
                                                            isManagingFonts ? "text-primary" : "text-muted hover:text-white"
                                                        )}
                                                    >
                                                        {isManagingFonts ? "Done" : "Manage"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {groupedFonts.map(({ family, variants }) => {
                                                    const isExpanded = expandedFamily === family;

                                                    // Single Item (No grouping needed for 1 item)
                                                    if (variants.length === 1) {
                                                        const f = variants[0];
                                                        return (
                                                            <div key={f.name} className="relative group/fontbtn">
                                                                <button
                                                                    onClick={() => updateObject(selectedObject!.id, {
                                                                        fontFamily: f.value,
                                                                        fontWeight: (f as any).weight || 'normal',
                                                                        fontStyle: (f as any).style || 'normal'
                                                                    })}
                                                                    disabled={isManagingFonts}
                                                                    className={cn(
                                                                        "w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border truncate pr-8",
                                                                        selectedObject.fontFamily === f.value &&
                                                                            (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') &&
                                                                            (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal')
                                                                            ? "bg-primary/20 border-primary text-primary"
                                                                            : "bg-white/5 border-transparent text-muted hover:bg-white/10",
                                                                        isManagingFonts && "opacity-50 pointer-events-none"
                                                                    )}
                                                                    style={{ fontFamily: f.value }}
                                                                >
                                                                    {f.name}
                                                                </button>
                                                                {!isManagingFonts && (
                                                                    <>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleFavorite(f.name);
                                                                            }}
                                                                            className={cn(
                                                                                "absolute top-2.5 right-2 opacity-0 group-hover/fontbtn:opacity-100 transition-opacity z-10 hover:scale-110",
                                                                                favorites.includes(f.name) ? "opacity-100 text-yellow-400" : "text-muted hover:text-white"
                                                                            )}
                                                                        >
                                                                            <Star className={cn("w-3 h-3", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                        </button>

                                                                        {/* DESKTOP DEFAULT BUTTON */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDefaultFont(f.value);
                                                                            }}
                                                                            className={cn(
                                                                                "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                defaultFont === f.value ? "text-green-400" : "opacity-0 group-hover/fontbtn:opacity-100 text-white/20 hover:text-white"
                                                                            )}
                                                                            title="Set as Default Font"
                                                                        >
                                                                            <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {isManagingFonts && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleFontVisibility(f.name);
                                                                        }}
                                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    }

                                                    // Grouped Item (Accordion)
                                                    return (
                                                        <div key={family} className={cn("col-span-2 border rounded-2xl overflow-hidden transition-all", isExpanded ? "bg-white/5 border-primary/50" : "bg-white/5 border-white/5")}>
                                                            <button
                                                                onClick={() => setExpandedFamily(isExpanded ? null : family)}
                                                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[16px] w-6 text-center" style={{ fontFamily: variants[0].value }}>Aa</span>
                                                                    <div className="text-left">
                                                                        <div className="text-[10px] font-black uppercase tracking-wider group-hover:text-white transition-colors">{family}</div>
                                                                        <div className="text-[9px] text-muted">{variants.length} styles</div>
                                                                    </div>
                                                                </div>
                                                                <ChevronDown className={cn("w-4 h-4 text-muted transition-transform", isExpanded && "rotate-180")} />
                                                            </button>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                                        <div className="p-2 pt-0 grid grid-cols-2 gap-2 border-t border-white/5 mt-1">
                                                                            {variants.map(f => (
                                                                                <div key={f.name} className="relative group/fontbtn">
                                                                                    <button
                                                                                        onClick={() => updateObject(selectedObject!.id, {
                                                                                            fontFamily: f.value,
                                                                                            fontWeight: (f as any).weight || 'normal',
                                                                                            fontStyle: (f as any).style || 'normal'
                                                                                        })}
                                                                                        disabled={isManagingFonts}
                                                                                        className={cn(
                                                                                            "w-full px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all border truncate pr-6",
                                                                                            selectedObject.fontFamily === f.value &&
                                                                                                (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') &&
                                                                                                (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal')
                                                                                                ? "bg-primary/20 border-primary text-primary"
                                                                                                : "bg-white/5 border-transparent text-muted hover:bg-white/10",
                                                                                            isManagingFonts && "opacity-50 pointer-events-none"
                                                                                        )}
                                                                                        style={{ fontFamily: f.value }}
                                                                                    >
                                                                                        {f.name.replace(family, '').trim() || 'Regular'}
                                                                                    </button>
                                                                                    {!isManagingFonts && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    toggleFavorite(f.name);
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "absolute top-2 right-1 opacity-0 group-hover/fontbtn:opacity-100 transition-opacity z-10 hover:scale-110",
                                                                                                    favorites.includes(f.name) ? "opacity-100 text-yellow-400" : "text-muted hover:text-white"
                                                                                                )}
                                                                                            >
                                                                                                <Star className={cn("w-2.5 h-2.5", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                                            </button>

                                                                                            {/* DESKTOP DEFAULT BUTTON (GROUPED) */}
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setDefaultFont(f.value);
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                                    defaultFont === f.value ? "text-green-400" : "opacity-0 group-hover/fontbtn:opacity-100 text-white/20 hover:text-white"
                                                                                                )}
                                                                                                title="Set as Default Font"
                                                                                            >
                                                                                                <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                    {isManagingFonts && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                toggleFontVisibility(f.name);
                                                                                            }}
                                                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10"
                                                                                        >
                                                                                            <X className="w-2.5 h-2.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setIsFontModalOpen(true)}
                                                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-muted hover:text-primary flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> More...
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хэмжээ</label>
                                                        <button
                                                            onClick={handleAutoFit}
                                                            className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md border border-primary/20 transition-all"
                                                            title="Auto Fit Text to Width"
                                                        >
                                                            <ScanLine className="w-3 h-3" />
                                                            <span className="text-[8px] font-black">AUTO</span>
                                                        </button>
                                                    </div>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.fontSize}</span>
                                                </div>
                                                <input
                                                    type="range" min="10" max="240"
                                                    value={selectedObject.fontSize}
                                                    onChange={(e) => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа</label>
                                                    <span className="text-xs font-bold text-primary">{Math.round(selectedObject.opacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.01"
                                                    value={selectedObject.opacity}
                                                    onChange={(e) => updateObject(selectedObject.id, { opacity: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Эргэлт</label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateObject(selectedObject.id, { rotation: 0 })}
                                                            className="p-1 hover:bg-white/10 rounded text-[10px] bg-white/5 text-muted hover:text-white transition-colors"
                                                            title="Хэвтээ (Horizontal)"
                                                        >
                                                            0°
                                                        </button>
                                                        <button
                                                            onClick={() => updateObject(selectedObject.id, { rotation: 90 })}
                                                            className="p-1 hover:bg-white/10 rounded text-[10px] bg-white/5 text-muted hover:text-white transition-colors"
                                                            title="Босоо (Vertical)"
                                                        >
                                                            90°
                                                        </button>
                                                        <span className="text-xs font-bold text-primary">{selectedObject.rotation}°</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range" min="-180" max="180"
                                                    value={selectedObject.rotation}
                                                    onChange={(e) => updateObject(selectedObject.id, { rotation: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Өргөн</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.width}</span>
                                                </div>
                                                <input
                                                    type="range" min="50" max="800"
                                                    value={selectedObject.width}
                                                    onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-5 gap-2">
                                            <button onClick={() => updateObject(selectedObject.id, { textAlign: 'left' })} className={cn("p-3 rounded-xl transition-all", selectedObject.textAlign === 'left' ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10")}>
                                                <AlignLeft className="w-4 h-4 mx-auto" />
                                            </button>
                                            <button onClick={() => updateObject(selectedObject.id, { textAlign: 'center' })} className={cn("p-3 rounded-xl transition-all", selectedObject.textAlign === 'center' ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10")}>
                                                <AlignCenter className="w-4 h-4 mx-auto" />
                                            </button>
                                            <button onClick={() => updateObject(selectedObject.id, { textAlign: 'right' })} className={cn("p-3 rounded-xl transition-all", selectedObject.textAlign === 'right' ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10")}>
                                                <AlignRight className="w-4 h-4 mx-auto" />
                                            </button>
                                            <button onClick={() => updateObject(selectedObject.id, { fontWeight: selectedObject.fontWeight === '900' ? '400' : '900' })} className={cn("p-3 rounded-xl transition-all", selectedObject.fontWeight === '900' ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10")}>
                                                <Bold className="w-4 h-4 mx-auto" />
                                            </button>
                                            <button
                                                onClick={() => updateObject(selectedObject.id, { textDecoration: selectedObject.textDecoration === 'underline' ? 'none' : 'underline' })}
                                                className={cn("p-3 rounded-xl transition-all", selectedObject.textDecoration === 'underline' ? "bg-primary text-white" : "bg-white/5 text-muted hover:bg-white/10")}
                                            >
                                                <Minus className="w-4 h-4 mx-auto" />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Текстийн Өнгө</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                    {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                                                        <button key={c} onClick={() => updateObject(selectedObject.id, { color: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.color === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                                <div className="relative">
                                                    <input type="color" value={selectedObject.color} onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* GRADIENT CONTROL (Desktop) */}
                                        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Gradient</label>
                                                <button
                                                    onClick={() => updateObject(selectedObject.id, { gradientEnabled: !selectedObject.gradientEnabled })}
                                                    className={cn("w-10 h-5 rounded-full transition-all relative", selectedObject.gradientEnabled ? "bg-primary" : "bg-white/10")}
                                                >
                                                    <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", selectedObject.gradientEnabled ? "left-6" : "left-1")} />
                                                </button>
                                            </div>

                                            {selectedObject.gradientEnabled && (
                                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хоёр дахь өнгө</label>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                                {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                                                                    <button key={c} onClick={() => updateObject(selectedObject.id, { color2: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.color2 === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                                                ))}
                                                            </div>
                                                            <input type="color" value={selectedObject.color2 || '#FF0000'} onChange={(e) => updateObject(selectedObject.id, { color2: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Өнцөг (Angle)</label>
                                                            <span className="text-xs font-bold text-primary">{selectedObject.gradientAngle || 180}°</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0" max="360"
                                                            value={selectedObject.gradientAngle || 180}
                                                            onChange={(e) => updateObject(selectedObject.id, { gradientAngle: Number(e.target.value) })}
                                                            className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* FX PRESETS TAB */}
                                {styleSubTab === 'fx' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            {STYLE_PRESETS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => {
                                                        saveHistory();
                                                        updateObject(selectedObject.id, preset.style);
                                                        toast.success(`${preset.name} хэв маягийг хэрэглэлээ!`, { icon: preset.previewIcon });
                                                    }}
                                                    className="group relative flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/50 rounded-2xl transition-all"
                                                >
                                                    <div className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform">
                                                        {preset.previewIcon}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">
                                                        {preset.name}
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                            <p className="text-[9px] font-bold text-primary/80 uppercase leading-relaxed text-center">
                                                Нэг товшилтоор бэлэн хэв маягийг хэрэглээрэй. Дараа нь хүссэнээрээ өөрчилж болно.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* STROKE TAB */}
                                {styleSubTab === 'stroke' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний зузаан</label>
                                                <span className="text-xs font-bold text-primary">{selectedObject.strokeWidth}</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="20"
                                                value={selectedObject.strokeWidth}
                                                onChange={(e) => updateObject(selectedObject.id, { strokeWidth: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний өнгө</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                    {['transparent', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(c => (
                                                        <button key={c} onClick={() => updateObject(selectedObject.id, { strokeColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90 flex items-center justify-center", selectedObject.strokeColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>
                                                            {c === 'transparent' && <X className="w-3 h-3 text-red-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input type="color" value={selectedObject.strokeColor === 'transparent' ? '#000000' : selectedObject.strokeColor} onChange={(e) => updateObject(selectedObject.id, { strokeColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* GLOW TAB */}
                                {styleSubTab === 'glow' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Гэрэлтэлтийн хэмжээ (Blur)</label>
                                                <span className="text-xs font-bold text-primary">{selectedObject.glowBlur || 0}</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100"
                                                value={selectedObject.glowBlur || 0}
                                                onChange={(e) => updateObject(selectedObject.id, { glowBlur: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа (Opacity)</label>
                                                <span className="text-xs font-bold text-primary">{Math.round((selectedObject.glowOpacity || 0.5) * 100)}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="1" step="0.01"
                                                value={selectedObject.glowOpacity || 0.5}
                                                onChange={(e) => updateObject(selectedObject.id, { glowOpacity: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Гэрлийн өнгө</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                    {['#FFFFFF', '#FFFF00', '#FF0000', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#000000'].map(c => (
                                                        <button key={c} onClick={() => updateObject(selectedObject.id, { glowColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.glowColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                                <input type="color" value={selectedObject.glowColor || '#FFFFFF'} onChange={(e) => updateObject(selectedObject.id, { glowColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SHADOW TAB */}
                                {styleSubTab === 'shadow' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Сүүдрийн бүдгэрэл (Blur)</label>
                                                <span className="text-xs font-bold text-primary">{selectedObject.shadowBlur || 0}</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="50"
                                                value={selectedObject.shadowBlur || 0}
                                                onChange={(e) => updateObject(selectedObject.id, { shadowBlur: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Offset X</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.shadowOffsetX || 0}</span>
                                                </div>
                                                <input
                                                    type="range" min="-30" max="30"
                                                    value={selectedObject.shadowOffsetX || 0}
                                                    onChange={(e) => updateObject(selectedObject.id, { shadowOffsetX: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Offset Y</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.shadowOffsetY || 0}</span>
                                                </div>
                                                <input
                                                    type="range" min="-30" max="30"
                                                    value={selectedObject.shadowOffsetY || 0}
                                                    onChange={(e) => updateObject(selectedObject.id, { shadowOffsetY: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа (Opacity)</label>
                                                <span className="text-xs font-bold text-primary">{Math.round((selectedObject.shadowOpacity || 0.5) * 100)}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="1" step="0.01"
                                                value={selectedObject.shadowOpacity || 0.5}
                                                onChange={(e) => updateObject(selectedObject.id, { shadowOpacity: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Сүүдрийн өнгө</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                    {['#000000', '#333333', '#666666', '#FF0000', '#0000FF', '#7C3AED', '#DB2777', '#059669'].map(c => (
                                                        <button key={c} onClick={() => updateObject(selectedObject.id, { shadowColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90", selectedObject.shadowColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                                <input type="color" value={selectedObject.shadowColor || '#000000'} onChange={(e) => updateObject(selectedObject.id, { shadowColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CANVAS TAB */}
                                {styleSubTab === 'canvas' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Булан</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.bgBorderRadius || 0}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100"
                                                    value={selectedObject.bgBorderRadius || 0}
                                                    onChange={(e) => updateObject(selectedObject.id, { bgBorderRadius: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Туяа (Opacity)</label>
                                                    <span className="text-xs font-bold text-primary">{Math.round((selectedObject.bgOpacity || 1) * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.01"
                                                    value={selectedObject.bgOpacity || 1}
                                                    onChange={(e) => updateObject(selectedObject.id, { bgOpacity: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Padding X</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.bgPaddingX || 0}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100"
                                                    value={selectedObject.bgPaddingX || 0}
                                                    onChange={(e) => updateObject(selectedObject.id, { bgPaddingX: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted">Padding Y</label>
                                                    <span className="text-xs font-bold text-primary">{selectedObject.bgPaddingY || 0}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100"
                                                    value={selectedObject.bgPaddingY || 0}
                                                    onChange={(e) => updateObject(selectedObject.id, { bgPaddingY: Number(e.target.value) })}
                                                    className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Фон өнгө</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 grid grid-cols-8 gap-1.5">
                                                    {['transparent', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(c => (
                                                        <button key={c} onClick={() => updateObject(selectedObject.id, { backgroundColor: c })} className={cn("w-full aspect-square rounded-lg border border-white/10 transition-transform active:scale-90 flex items-center justify-center", selectedObject.backgroundColor === c && "ring-2 ring-primary ring-offset-2 ring-offset-black")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>
                                                            {c === 'transparent' && <X className="w-3 h-3 text-red-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input type="color" value={selectedObject.backgroundColor === 'transparent' ? '#000000' : selectedObject.backgroundColor} onChange={(e) => updateObject(selectedObject.id, { backgroundColor: e.target.value })} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SPACING TAB */}
                                {styleSubTab === 'spacing' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Мөр хоорондын зай</label>
                                                <span className="text-xs font-bold text-primary">{selectedObject.lineHeight}</span>
                                            </div>
                                            <input
                                                type="range" min="0.5" max="3" step="0.1"
                                                value={selectedObject.lineHeight}
                                                onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Үсэг хоорондын зай</label>
                                                <span className="text-xs font-bold text-primary">{selectedObject.letterSpacing}px</span>
                                            </div>
                                            <input
                                                type="range" min="-10" max="50"
                                                value={selectedObject.letterSpacing}
                                                onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })}
                                                className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => deleteObject(selectedObject!.id)}
                                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-tighter text-[10px] transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Объектыг устгах
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh] opacity-50">
                                <MousePointer2 className="w-12 h-12 mb-4 text-muted" />
                                <p className="text-sm font-bold text-muted">Select an object to edit style</p>
                            </div>
                        )
                    )}

                    {activeTab === 'style' && !selectedObject && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30 mt-20">
                            <Move className="w-12 h-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Обьект сонгож загварыг нь засварлана уу</p>
                        </div>
                    )}

                    {activeTab === 'layers' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
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
                                        <button onClick={() => setLayerSettings(prev => ({ ...prev, text: { ...prev.text, visible: !prev.text.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                                            {layerSettings.text.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setLayerSettings(prev => ({ ...prev, text: { ...prev.text, locked: !prev.text.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                                            {layerSettings.text.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {/* List of objects (Mini) */}
                                {layerSettings.text.visible && (
                                    <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                                        {objects.map((obj, i) => (
                                            <div key={obj.id} onClick={() => setSelectedId(obj.id)} className={cn("p-2 rounded-lg text-xs font-bold truncate cursor-pointer", selectedId === obj.id ? "bg-primary/20 text-primary" : "text-muted hover:text-white hover:bg-white/5")}>
                                                #{i + 1}: {obj.text || 'Empty'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Drawings Layer */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-green-500/20 text-green-500 rounded-lg"> <Eraser className="w-5 h-5" /> </div>
                                    <div>
                                        <div className="text-sm font-bold">Clean / SFX</div>
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Drawings</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setLayerSettings(prev => ({ ...prev, drawings: { ...prev.drawings, visible: !prev.drawings.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                                        {layerSettings.drawings.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setLayerSettings(prev => ({ ...prev, drawings: { ...prev.drawings, locked: !prev.drawings.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                                        {layerSettings.drawings.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {layerSettings.drawings.visible && (
                                <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                                    {drawings.map((draw, i) => (
                                        <div
                                            key={draw.id}
                                            onClick={() => setSelectedId(draw.id)}
                                            className={cn(
                                                "p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer group",
                                                selectedId === draw.id ? "bg-primary/20 text-primary border border-primary/20" : "text-muted hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] opacity-50">#{i + 1}</span>
                                                <span className="capitalize">{draw.type || 'Eraser'}</span>
                                                {draw.type === 'patch' && <ScanLine className="w-3 h-3" />}
                                                {draw.type === 'inpaint' && <Sparkles className="w-3 h-3 text-purple-400" />}
                                                {draw.type === 'gradient' && <Maximize2 className="w-3 h-3" />}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDrawingsMap(prev => ({
                                                        ...prev,
                                                        [activeChapterId]: (prev[activeChapterId] || []).filter(d => d.id !== draw.id)
                                                    }));
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Original Layer */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg"> <FileImage className="w-5 h-5" /> </div>
                                    <div>
                                        <div className="text-sm font-bold">Original Image</div>
                                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest">{images.length} pages</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setLayerSettings(prev => ({ ...prev, original: { ...prev.original, visible: !prev.original.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.original.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                                        {layerSettings.original.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setLayerSettings(prev => ({ ...prev, original: { ...prev.original, locked: !prev.original.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.original.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                                        {layerSettings.original.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >





































            {/* UNIFIED MOBILE ACTION PANEL (World-Class UI Overhaul) */}
            <AnimatePresence>
                {(!isPreviewMode) && ( // Hide panel in preview mode
                    <motion.div
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        className="md:hidden fixed bottom-2 left-2 right-2 z-50 pointer-events-none"
                    >
                        <motion.div
                            layout
                            className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto transition-all duration-500 ease-[0.22,1,0.36,1]"
                            style={{
                                maxHeight: (selectedId && !isMobileScriptOpen) || isMagicWandActive || isEraserActive || isBlendActive ? '60vh' : 'auto'
                            }}
                        >
                            {/* Drag Indicator / Minimize Toggle */}
                            <div
                                className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 cursor-pointer active:scale-95 transition-transform"
                            />

                            <div className={cn("px-2 pb-safe transition-all duration-300", "h-auto opacity-100")}>
                                {/* CONTEXTUAL SETTINGS PANEL (Visible when tool active) */}
                                <AnimatePresence mode="wait">
                                    {isMagicWandActive && (
                                        <motion.div key="magic-wand-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                                <span>Cleaning Power</span>
                                                <span className="text-primary bg-primary/10 px-2 py-1 rounded-lg">{magicWandThreshold}</span>
                                            </div>
                                            <div className="flex items-center gap-4 pb-2">
                                                <button onClick={() => setMagicWandThreshold(Math.max(1, magicWandThreshold - 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                <input type="range" min="1" max="150" value={magicWandThreshold} onChange={(e) => setMagicWandThreshold(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                <button onClick={() => setMagicWandThreshold(Math.min(150, magicWandThreshold + 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {isEraserActive && (
                                        <motion.div key="eraser-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                                <span>Eraser Size</span>
                                                <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{eraserSize}px</span>
                                            </div>
                                            <div className="flex items-center gap-4 pb-2">
                                                <button onClick={() => setEraserSize(Math.max(5, eraserSize - 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                <input type="range" min="5" max="100" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                <button onClick={() => setEraserSize(Math.min(100, eraserSize + 5))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {isBlendActive && (
                                        <motion.div key="blend-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-4 space-y-6">
                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest">
                                                <span>Blend Size</span>
                                                <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{blendSize}px</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => setBlendSize(Math.max(10, blendSize - 10))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                <input type="range" min="10" max="100" value={blendSize} onChange={(e) => setBlendSize(Number(e.target.value))} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                <button onClick={() => setBlendSize(Math.min(100, blendSize + 10))} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {selectedObject && !isEraserActive && !isMagicWandActive && !isBlendActive && !isMobileScriptOpen && (
                                        <motion.div key="text-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 py-1 space-y-4 max-h-[45vh] overflow-y-auto scrollbar-hide pb-6">
                                            {/* Style Tabs cluster */}
                                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3 sticky top-0 bg-black/5 backdrop-blur-md z-10 -mx-6 px-6 border-b border-white/5">
                                                {[
                                                    { id: 'basic', label: 'Загвар' },
                                                    { id: 'stroke', label: 'Хүрээ' },
                                                    { id: 'shadow', label: 'Сүүдэр' },
                                                    { id: 'opacity', label: 'Тунгалаг' },
                                                    { id: 'spacing', label: 'Зай' },
                                                    { id: 'canvas', label: 'Фон' }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={(e) => { e.stopPropagation(); setStyleSubTab(tab.id as any); }}
                                                        className={cn(
                                                            "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                                                            styleSubTab === tab.id ? "bg-primary text-white shadow-[0_4px_12px_rgba(var(--primary),0.3)]" : "bg-white/5 text-muted hover:bg-white/10"
                                                        )}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                                {/* (Rest of styling logic) */}
                                                {styleSubTab === 'basic' && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                <span>Фонт сонгох</span>
                                                                <span className="text-primary">{FONTS.find(f => f.value === selectedObject.fontFamily)?.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                {expandedFamily ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setExpandedFamily(null)}
                                                                            className="flex-shrink-0 h-[60px] px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-all mr-2"
                                                                        >
                                                                            <ArrowLeft className="w-4 h-4" />
                                                                            <span className="text-[10px] font-bold uppercase">Back</span>
                                                                        </button>
                                                                        {groupedFonts.find(g => g.family === expandedFamily)?.variants.map(f => (
                                                                            <div key={f.name} className="relative group/fontbtn flex-shrink-0">
                                                                                <button
                                                                                    onClick={() => updateObject(selectedObject!.id, {
                                                                                        fontFamily: f.value,
                                                                                        fontWeight: (f as any).weight || 'normal',
                                                                                        fontStyle: (f as any).style || 'normal'
                                                                                    })}
                                                                                    disabled={isManagingFonts}
                                                                                    className={cn(
                                                                                        "min-w-[100px] h-[60px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2",
                                                                                        selectedObject.fontFamily === f.value &&
                                                                                            (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') &&
                                                                                            (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal')
                                                                                            ? "bg-primary/20 border-primary text-primary"
                                                                                            : "bg-white/5 border-white/5 text-muted hover:bg-white/10",
                                                                                        isManagingFonts && "opacity-50 pointer-events-none"
                                                                                    )}
                                                                                >
                                                                                    <span className="text-[14px] leading-none" style={{ fontFamily: f.value }}>Aa</span>
                                                                                    <span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name.replace(expandedFamily, '').trim() || 'Regular'}</span>
                                                                                </button>
                                                                                {!isManagingFonts && (
                                                                                    <>
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                toggleFavorite(f.name);
                                                                                            }}
                                                                                            className={cn(
                                                                                                "absolute top-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-full",
                                                                                                favorites.includes(f.name) ? "text-yellow-400" : "text-white/20 hover:text-white"
                                                                                            )}
                                                                                        >
                                                                                            <Star className={cn("w-2.5 h-2.5", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                                        </button>

                                                                                        {/* DEFAULT BUTTON - DEBUG VISIBILITY */}
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setDefaultFont(f.value);
                                                                                            }}
                                                                                            className={cn(
                                                                                                "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                                defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white"
                                                                                            )}
                                                                                            title="Set as Default Font"
                                                                                        >
                                                                                            <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    groupedFonts.map(({ family, variants }) => {
                                                                        if (variants.length === 1) {
                                                                            const f = variants[0];
                                                                            return (
                                                                                <div key={f.name} className="relative group/fontbtn flex-shrink-0">
                                                                                    <button onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        updateObject(selectedObject.id, {
                                                                                            fontFamily: f.value,
                                                                                            fontWeight: (f as any).weight || 'normal',
                                                                                            fontStyle: (f as any).style || 'normal'
                                                                                        })
                                                                                    }} className={cn("min-w-[100px] h-[60px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2", selectedObject.fontFamily === f.value && (selectedObject.fontWeight || 'normal') === ((f as any).weight || 'normal') && (selectedObject.fontStyle || 'normal') === ((f as any).style || 'normal') ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-muted hover:bg-white/10")}><span className="text-[14px] leading-none" style={{ fontFamily: f.value }}>Aa</span><span className="text-[8px] font-bold uppercase truncate w-full text-center">{f.name}</span></button>

                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleFavorite(f.name);
                                                                                        }}
                                                                                        className={cn(
                                                                                            "absolute top-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-full",
                                                                                            favorites.includes(f.name) ? "text-yellow-400" : "text-white/20 hover:text-white"
                                                                                        )}
                                                                                    >
                                                                                        <Star className={cn("w-2.5 h-2.5", favorites.includes(f.name) && "fill-yellow-400")} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDefaultFont(f.value);
                                                                                        }}
                                                                                        className={cn(
                                                                                            "absolute bottom-1 right-1 p-1 z-10 transition-colors bg-black/50 rounded-md flex items-center gap-1",
                                                                                            defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white"
                                                                                        )}
                                                                                        title="Set as Default Font"
                                                                                    >
                                                                                        <Check className={cn("w-2.5 h-2.5", defaultFont === f.value ? "text-green-400" : "text-white/20 hover:text-white")} />
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        // Group Button
                                                                        return (
                                                                            <button
                                                                                key={family}
                                                                                onClick={() => setExpandedFamily(family)}
                                                                                className="flex-shrink-0 min-w-[100px] h-[60px] rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-1 p-2 group"
                                                                            >
                                                                                <span className="text-[14px] leading-none" style={{ fontFamily: variants[0].value }}>Aa</span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="text-[8px] font-bold uppercase truncate max-w-[80px] text-center group-hover:text-white text-muted">{family}</span>
                                                                                    <ChevronDown className="w-3 h-3 text-muted" />
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setIsFontModalOpen(true); }}
                                                                    className="flex-shrink-0 min-w-[60px] h-[60px] rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-muted hover:text-primary transition-all flex flex-col items-center justify-center gap-1"
                                                                >
                                                                    <Plus className="w-5 h-5" />
                                                                    <span className="text-[8px] font-bold uppercase">More</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                <span>Текст хэмжээ</span>
                                                                <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.fontSize}px</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontSize: Math.max(8, selectedObject.fontSize - 2) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                                <input type="range" min="8" max="200" value={selectedObject.fontSize} onChange={(e) => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontSize: Math.min(300, selectedObject.fontSize + 2) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 bg-white/5 p-4 rounded-[2rem] border border-white/5">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                <span>Текст өргөн (Width)</span>
                                                                <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{Math.round(selectedObject.width)}px</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { width: Math.max(20, selectedObject.width - 20) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
                                                                <input type="range" min="20" max="2000" value={selectedObject.width} onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { width: Math.min(3000, selectedObject.width + 20) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
                                                            </div>

                                                            <div className="h-[1px] bg-white/5 w-full my-2" />

                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                <span>Мөр хоорондын зай</span>
                                                                <span className="text-primary">{selectedObject.lineHeight || 1.1}</span>
                                                            </div>
                                                            <input type="range" min="0.5" max="3" step="0.1" value={selectedObject.lineHeight || 1.1} onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />

                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1 mt-2">
                                                                <span>Үсэг хоорондын зай</span>
                                                                <span className="text-primary">{selectedObject.letterSpacing || 0}px</span>
                                                            </div>
                                                            <input type="range" min="-5" max="20" step="0.5" value={selectedObject.letterSpacing || 0} onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">
                                                                {selectedObject.gradientEnabled ? "Нэг дэх өнгө" : "Текст өнгө"}
                                                            </label>
                                                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                {['#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#AF52DE', '#FF9500', '#5856D6', '#8E8E93'].map(c => (
                                                                    <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { color: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all", selectedObject.color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c }} />
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-6 bg-white/5 p-4 rounded-[2rem] border border-white/5">
                                                            <div className="flex items-center justify-between px-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Gradient</label>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { gradientEnabled: !selectedObject.gradientEnabled }) }}
                                                                    className={cn("w-10 h-5 rounded-full transition-all relative", selectedObject.gradientEnabled ? "bg-primary" : "bg-white/10")}
                                                                >
                                                                    <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", selectedObject.gradientEnabled ? "left-6" : "left-1")} />
                                                                </button>
                                                            </div>

                                                            {selectedObject.gradientEnabled && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                                                                    <div className="space-y-3">
                                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Хоёр дахь өнгө</label>
                                                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                            {['#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#AF52DE', '#FF9500', '#5856D6', '#8E8E93'].map(c => (
                                                                                <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { color2: c }) }} className={cn("w-10 h-10 rounded-2xl flex-shrink-0 border-2 transition-all", selectedObject.color2 === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c }} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest px-1">
                                                                            <span>Чиглэл (Angle)</span>
                                                                            <span className="text-primary">{selectedObject.gradientAngle || 180}°</span>
                                                                        </div>
                                                                        <input
                                                                            type="range" min="0" max="360"
                                                                            value={selectedObject.gradientAngle || 180}
                                                                            onChange={(e) => updateObject(selectedObject.id, { gradientAngle: Number(e.target.value) })}
                                                                            className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none"
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[{ id: 'left', icon: AlignLeft }, { id: 'center', icon: AlignCenter }, { id: 'right', icon: AlignRight }].map(align => (
                                                                <button key={align.id} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { textAlign: align.id as any }) }} className={cn("p-4 rounded-2xl transition-all", selectedObject.textAlign === align.id ? "bg-primary text-white" : "bg-white/5 text-muted")}> <align.icon className="w-5 h-5 mx-auto" /> </button>
                                                            ))}
                                                            <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { fontWeight: selectedObject.fontWeight === '900' ? '400' : '900' }) }} className={cn("p-4 rounded-2xl transition-all", selectedObject.fontWeight === '900' ? "bg-primary text-white" : "bg-white/5 text-muted")}> <Bold className="w-5 h-5 mx-auto" /> </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {styleSubTab === 'stroke' && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"> <span>Зузаан</span> <span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.strokeWidth}</span> </div>
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeWidth: Math.max(0, (selectedObject.strokeWidth || 0) - 1) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"><Minus className="w-4 h-4" /></button>
                                                                <input type="range" min="0" max="30" value={selectedObject.strokeWidth || 0} onChange={(e) => updateObject(selectedObject.id, { strokeWidth: Number(e.target.value) })} className="flex-1 h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                                <button onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeWidth: Math.min(50, (selectedObject.strokeWidth || 0) + 1) }) }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"><Plus className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Хүрээний өнгө</label>
                                                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                {['transparent', '#000000', '#FFFFFF', '#FF3B30', '#34C759', '#007AFF', '#FFCC00'].map(c => (
                                                                    <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { strokeColor: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all flex items-center justify-center", selectedObject.strokeColor === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>{c === 'transparent' && <X className="w-4 h-4 text-red-500" />}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {styleSubTab === 'shadow' && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Blur</span><span className="text-white bg-white/10 px-2 py-1 rounded-lg">{selectedObject.shadowBlur || 0}</span></div>
                                                            <input type="range" min="0" max="40" value={selectedObject.shadowBlur || 0} onChange={(e) => updateObject(selectedObject.id, { shadowBlur: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-bold text-muted uppercase">Offset X</label>
                                                                <input type="range" min="-20" max="20" value={selectedObject.shadowOffsetX || 0} onChange={(e) => updateObject(selectedObject.id, { shadowOffsetX: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-bold text-muted uppercase">Offset Y</label>
                                                                <input type="range" min="-20" max="20" value={selectedObject.shadowOffsetY || 0} onChange={(e) => updateObject(selectedObject.id, { shadowOffsetY: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {styleSubTab === 'opacity' && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Opacity</span><span className="text-white bg-white/10 px-2 py-1 rounded-lg">{Math.round((selectedObject.opacity || 1) * 100)}%</span></div>
                                                            <input type="range" min="0" max="1" step="0.05" value={selectedObject.opacity ?? 1} onChange={(e) => updateObject(selectedObject.id, { opacity: Number(e.target.value) })} className="w-full h-2 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                {styleSubTab === 'spacing' && (
                                                    <div className="space-y-8">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Мөр хоорондын зай</span><span className="text-primary">{selectedObject.lineHeight}</span></div>
                                                            <input type="range" min="0.5" max="3" step="0.1" value={selectedObject.lineHeight} onChange={(e) => updateObject(selectedObject.id, { lineHeight: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-widest"><span>Үсэг хоорондын зай</span><span className="text-primary">{selectedObject.letterSpacing}px</span></div>
                                                            <input type="range" min="-5" max="20" value={selectedObject.letterSpacing} onChange={(e) => updateObject(selectedObject.id, { letterSpacing: Number(e.target.value) })} className="w-full h-1.5 accent-primary bg-white/10 rounded-full appearance-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                {styleSubTab === 'canvas' && (
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-bold text-muted uppercase flex justify-between"><span>Бөөрөнхий</span> <span>{selectedObject.bgBorderRadius || 0}</span></label>
                                                                <input type="range" min="0" max="100" value={selectedObject.bgBorderRadius || 0} onChange={(e) => updateObject(selectedObject.id, { bgBorderRadius: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-bold text-muted uppercase flex justify-between"><span>Зай (Padding)</span> <span>{selectedObject.bgPaddingX || 0}</span></label>
                                                                <input type="range" min="0" max="50" value={selectedObject.bgPaddingX || 0} onChange={(e) => updateObject(selectedObject.id, { bgPaddingX: Number(e.target.value), bgPaddingY: Number(e.target.value) })} className="w-full h-1 accent-primary bg-white/10 rounded-full appearance-none" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">Дэвсгэр өнгө</label>
                                                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                                                                {['transparent', '#000000', '#FFFFFF', '#FF3B30', '#34C759', '#FFD60A'].map(c => (
                                                                    <button key={c} onClick={(e) => { e.stopPropagation(); updateObject(selectedObject.id, { backgroundColor: c }) }} className={cn("w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all flex items-center justify-center", selectedObject.backgroundColor === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}>{c === 'transparent' && <X className="w-4 h-4 text-red-500" />}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* MODE INDICATOR BAR (World Class Visual) */}
                                {!selectedId && !isMagicWandActive && !isEraserActive && !isBlendActive && (
                                    <div className="flex items-center justify-center h-8 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">
                                            {mobileMode === 'tools' && 'Precision Tools'}
                                            {mobileMode === 'fx' && 'Special Effects'}
                                            {mobileMode === 'text' && 'Typography'}
                                            {mobileMode === 'draw' && 'Expert Drawing'}
                                            {mobileMode === 'view' && 'Viewport'}
                                        </span>
                                    </div>
                                )}

                                {/* PRIMARY NAVIGATION / TOOLBAR */}
                                <div className="p-2 pt-0 pb-2">
                                    <div className="flex flex-col gap-1">
                                        {/* PICSART-STYLE SUB-BAR (Integrated) */}
                                        <AnimatePresence>
                                            {!selectedId && mobileMode !== 'text' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 h-16 border-b border-white/5 mb-1"
                                                >
                                                    {mobileMode === 'tools' && (
                                                        <>
                                                            <ToolBtn active={isMagicWandActive} icon={Sparkles} label="Magic" onClick={() => { setIsMagicWandActive(!isMagicWandActive); setIsEraserActive(false); setIsRectToolActive(false); }} />
                                                            <ToolBtn active={isRectToolActive} icon={Square} label="Rect" onClick={() => { setIsRectToolActive(!isRectToolActive); setIsMagicWandActive(false); setIsEraserActive(false); }} />
                                                            <ToolBtn active={isCropActive} icon={Crop} label="Crop" onClick={() => setIsCropActive(!isCropActive)} />
                                                            <ToolBtn active={isOCREnabled} icon={ScanLine} label="OCR" onClick={() => setIsOCREnabled(!isOCREnabled)} />
                                                        </>
                                                    )}
                                                    {mobileMode === 'draw' && (
                                                        <>
                                                            <ToolBtn active={isEraserActive} icon={Eraser} label="Eraser" onClick={() => { setIsEraserActive(!isEraserActive); setIsMagicWandActive(false); setIsRectToolActive(false); }} />
                                                            <ToolBtn active={isBlendActive} icon={Droplet} label="Blend" onClick={() => setIsBlendActive(!isBlendActive)} />
                                                            <ToolBtn active={activeTab === 'layers'} icon={Layers} label="Layers" onClick={() => setActiveTab('layers')} />
                                                        </>
                                                    )}
                                                    {mobileMode === 'view' && (
                                                        <>
                                                            <ToolBtn icon={isPreviewMode ? X : Eye} label={isPreviewMode ? "Edit" : "Preview"} onClick={() => setIsPreviewMode(!isPreviewMode)} />
                                                            <ToolBtn icon={Minimize2} label="Out" onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale - 0.2) }))} />
                                                            <ToolBtn icon={Maximize2} label="In" onClick={() => setViewport(v => ({ ...v, scale: Math.min(10, v.scale + 0.2) }))} />
                                                            <ToolBtn icon={RotateCcw} label="Reset" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} />
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* MAIN CATEGORIES */}
                                        <div className="flex items-center w-max min-w-full px-2 gap-3 overflow-x-auto scrollbar-hide">
                                            {selectedId ? (
                                                <div className="flex items-center gap-1 w-full justify-around py-1">
                                                    <NavBtn icon={X} label="Close" onClick={() => setSelectedId(null)} />
                                                    <div className="w-px h-10 bg-white/10 mx-1" />
                                                    <NavBtn active={activeTab === 'style'} icon={Sliders} label="Style" onClick={() => setActiveTab('style')} highlight />
                                                    <NavBtn icon={Languages} label="Script" onClick={() => setIsMobileScriptOpen(true)} />
                                                    <NavBtn icon={Trash2} label="Delete" onClick={() => deleteObject(selectedId)} danger />
                                                </div>
                                            ) : (
                                                <>
                                                    <NavBtn active={mobileMode === 'tools'} icon={LayoutGrid} label="Tools" onClick={() => setMobileMode('tools')} />
                                                    <NavBtn active={mobileMode === 'fx'} icon={Sparkles} label="FX" onClick={() => setMobileMode('fx')} />
                                                    <NavBtn
                                                        active={mobileMode === 'text'}
                                                        icon={Type} label="Text"
                                                        onClick={() => {
                                                            if (mobileMode === 'text') {
                                                                const activeImg = images.find(i => {
                                                                    const el = document.getElementById(`img-el-${i.id}`);
                                                                    if (!el) return false;
                                                                    const r = el.getBoundingClientRect();
                                                                    return r.top < window.innerHeight && r.bottom > 0;
                                                                }) || images[0];
                                                                if (activeImg) {
                                                                    const el = document.getElementById(`img-el-${activeImg.id}`);
                                                                    const rect = el?.getBoundingClientRect();
                                                                    const cx = rect ? (window.innerWidth / 2 - rect.left) / viewport.scale : 100;
                                                                    const cy = rect ? (window.innerHeight / 3 - rect.top) / viewport.scale : 100;
                                                                    addText(activeImg.id, Math.round(cx), Math.round(cy));
                                                                }
                                                            } else {
                                                                setMobileMode('text');
                                                            }
                                                        }}
                                                    />
                                                    <NavBtn active={mobileMode === 'draw'} icon={Brush} label="Draw" onClick={() => setMobileMode('draw')} />
                                                    <NavBtn active={mobileMode === 'view'} icon={Maximize2} label="View" onClick={() => setMobileMode('view')} />
                                                    <div className="w-px h-8 bg-white/10 mx-2" />
                                                    <button onClick={undo} className="p-3 text-muted active:text-white transition-colors"> <RotateCcw className="w-5 h-5" /> </button>
                                                    <button onClick={redo} className="p-3 text-muted active:text-white transition-colors"> <RotateCw className="w-5 h-5" /> </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Mobile Script Drawer (Bottom Sheet Style) */}
            <AnimatePresence>
                {
                    isMobileScriptOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileScriptOpen(false)}
                                className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                            />
                            <motion.div
                                drag="y"
                                dragConstraints={{ top: 0 }}
                                dragElastic={{ bottom: 0.1, top: 0.1 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100) {
                                        setIsMobileScriptOpen(false);
                                    }
                                }}
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="md:hidden fixed bottom-0 left-0 right-0 h-[85vh] bg-[#0a0a0a] rounded-t-[40px] overflow-hidden z-[70] border-t border-white/10 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
                            >
                                {/* Drag Handle */}
                                <div className="w-full flex justify-center pt-2 pb-1 bg-gradient-to-b from-white/5 to-transparent cursor-pointer" onClick={() => setIsMobileScriptOpen(false)}>
                                    <div className="w-16 h-1 bg-white/20 rounded-full mt-2" />
                                </div>

                                {/* Drawer Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <h3 className="text-lg font-black uppercase tracking-tight">Translations</h3>
                                    <button onClick={() => setIsMobileScriptOpen(false)} className="p-2 bg-white/5 rounded-full">
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
                                                objects.filter(o => o.imageId === img.id).map((obj, oIdx) => {
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
                                                                            setIsMobileScriptOpen(false);
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
                    )
                }
            </AnimatePresence >

            {/* Shortcut Guide Modal */}
            <AnimatePresence>
                {
                    isShortcutGuideOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setIsShortcutGuideOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
                                onClick={e => e.stopPropagation()}
                            >
                                <button onClick={() => setIsShortcutGuideOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors">
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
                    )
                }
            </AnimatePresence >



            {/* Mobile Bottom Toolbar Spacing */}
            <div className="md:hidden h-20" />

            <GoogleFontsModal
                isOpen={isFontModalOpen}
                onClose={() => setIsFontModalOpen(false)}
                onSelect={handleGoogleFontSelect}
                currentDefault={defaultFont}
                onSetDefault={setDefaultFont}
            />

            <StylePainter
                objects={objects}
                updateObject={updateObject}
                onMount={(api) => { stylePainterRef.current = api; }}
            />
        </motion.div >
    );
}

// Render Portal for Modal at the end of component tree
function ModalContainer({ children }: { children: React.ReactNode }) {
    // In Next.js App Router, creating a portal target or just rendering fixed is fine.
    return <>{children}</>;
}

