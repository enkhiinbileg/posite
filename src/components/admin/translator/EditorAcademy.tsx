"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Wand2, Type, Command, Star,
    ShieldCheck, ChevronRight, BookOpen, Layers,
    Plus, Edit3, Trash2, Save, Loader2, Video,
    TextQuote, GripVertical, ImagePlus, ImageIcon,
    Settings2, LayoutGrid, Palette, Menu, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// --- Interfaces ---

interface Category {
    id: string;
    title: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind class
    order_index: number;
}

interface LessonContent {
    title: string;
    desc: string;
    image_url?: string;
}

interface Lesson {
    id: string;
    title: string;
    description: string;
    category: string;
    content: LessonContent[];
    video_url?: string;
    order_index: number;
}

interface EditorAcademyProps {
    isOpen: boolean;
    onClose: () => void;
}

// Icon mapping for dynamic rendering
const ICON_MAP: Record<string, any> = {
    Wand2, Type, Command, Star, ShieldCheck,
    BookOpen, Layers, Sparkles, Video, Settings2,
    LayoutGrid, Palette, Menu, ChevronLeft
};

export function EditorAcademy({ isOpen, onClose }: EditorAcademyProps) {
    // default categories just in case DB is empty initially (or while loading)
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Lesson Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);

    // Category Management State
    const [isManagingCategories, setIsManagingCategories] = useState(false);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            checkUserRole();
            fetchCategoriesAndLessons();
        }
    }, [isOpen]);

    async function checkUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('is_admin, is_moderator').eq('id', user.id).single();
        setIsAdmin(!!(profile?.is_admin || profile?.is_moderator));
    }

    async function fetchCategoriesAndLessons() {
        setLoading(true);

        // 1. Fetch Categories
        const { data: cats, error: catError } = await supabase
            .from('editor_academy_categories')
            .select('*')
            .order('order_index', { ascending: true });

        if (catError) console.error('Error fetching categories:', catError);

        // Fallback or Set
        if (cats && cats.length > 0) {
            setCategories(cats);
            if (!activeCategory) setActiveCategory(cats[0].id);
        } else {
            // Static Fallback if DB is empty or error (during migration)
            const staticCats = [
                { id: 'tools', title: 'Ухаалаг хэрэгслүүд', icon: 'Wand2', color: 'text-primary', order_index: 0 },
                { id: 'typography', title: 'Үсгийн соёл', icon: 'Type', color: 'text-blue-500', order_index: 1 },
                { id: 'hotkeys', title: 'Халуун товчнууд', icon: 'Command', color: 'text-yellow-500', order_index: 2 },
                { id: 'pro-tips', title: 'Pro Tips', icon: 'Star', color: 'text-purple-500', order_index: 3 }
            ];
            setCategories(staticCats);
            if (!activeCategory) setActiveCategory('tools');
        }

        // 2. Fetch Lessons
        const { data: less, error: lessError } = await supabase
            .from('editor_academy_lessons')
            .select('*')
            .order('order_index', { ascending: true });

        if (less) setLessons(less);
        if (lessError) toast.error('Хичээлүүдийг татахад алдаа гарлаа');

        setLoading(false);
    }

    // --- Actions ---

    const handleSaveLesson = async () => {
        if (!editingLesson || !editingLesson.title) {
            toast.error('Гарчиг заавал байх ёстой');
            return;
        }
        setLoading(true);

        const lessonData = {
            title: editingLesson.title,
            description: editingLesson.description || '',
            category: activeCategory, // Saves to current active category
            content: editingLesson.content || [],
            video_url: editingLesson.video_url || '',
            order_index: editingLesson.order_index || 0
        };

        let result;
        if (editingLesson.id) {
            result = await supabase.from('editor_academy_lessons').update(lessonData).eq('id', editingLesson.id);
        } else {
            result = await supabase.from('editor_academy_lessons').insert([lessonData]);
        }

        if (result.error) {
            toast.error('Хадгалахад алдаа гарлаа: ' + result.error.message);
        } else {
            toast.success('Амжилттай хадгалагдлаа');
            setIsEditing(false);
            setEditingLesson(null);
            fetchCategoriesAndLessons();
        }
        setLoading(false);
    };

    const handleDeleteLesson = async (id: string) => {
        if (!confirm('Энэ хичээлийг устгахдаа итгэлтэй байна уу?')) return;
        const { error } = await supabase.from('editor_academy_lessons').delete().eq('id', id);
        if (error) toast.error('Устгахад алдаа гарлаа');
        else {
            toast.success('Устгагдлаа');
            fetchCategoriesAndLessons();
        }
    };

    // --- Derived State ---
    const activeLessons = lessons.filter(l => l.category === activeCategory);
    const currentCategory = categories.find(c => c.id === activeCategory);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-6xl h-[100dvh] md:h-[85vh] bg-[#0a0a0a]/90 backdrop-blur-3xl border-0 md:border border-white/10 rounded-none md:rounded-[2.5rem] shadow-none md:shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10"
                >
                    {/* Ambient Background Orbs */}
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
                    {/* Header */}
                    <div className="px-5 py-4 md:px-8 md:py-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic font-outfit">Editor Academy</h2>
                                <p className="text-muted text-xs font-bold uppercase tracking-widest opacity-60">
                                    {isAdmin ? 'Админы Удирдлага' : 'Орчуулагчдад зориулсан мастер хичээл'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Mobile Hamburger Menu */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <div className="hidden md:flex items-center gap-4">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => setIsManagingCategories(!isManagingCategories)}
                                            className={cn(
                                                "p-3 rounded-2xl transition-all border border-transparent group",
                                                isManagingCategories ? "bg-white/10 text-white" : "hover:bg-white/5 text-muted hover:text-white"
                                            )}
                                            title="Ангилал удирдах"
                                        >
                                            <Layers className="w-5 h-5" />
                                        </button>
                                        {!isManagingCategories && (
                                            <button
                                                onClick={() => {
                                                    setIsEditing(!isEditing);
                                                    setEditingLesson(null);
                                                }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2",
                                                    isEditing ? "bg-red-500/20 text-red-500" : "bg-white/5 text-muted hover:text-white"
                                                )}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                {isEditing ? 'Болих' : 'Засах горим'}
                                            </button>
                                        )}
                                    </>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 group"
                                >
                                    <X className="w-6 h-6 text-muted group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                        {/* Mobile Menu Overlay */}
                        <AnimatePresence>
                            {isMobileMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: '-100%' }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: '-100%' }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="absolute inset-0 z-50 bg-[#0a0a0a] md:hidden flex flex-col"
                                >
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Цэс</h3>
                                        <button
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {categories.map((cat) => {
                                            const Icon = ICON_MAP[cat.icon] || Star;
                                            const isActive = activeCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setActiveCategory(cat.id);
                                                        setIsMobileMenuOpen(false);
                                                        setIsManagingCategories(false);
                                                        if (isEditing) setEditingLesson(null);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                                        isActive
                                                            ? "bg-white/10 text-white shadow-lg border border-white/5"
                                                            : "text-muted hover:text-white/80 hover:bg-white/5 border border-transparent"
                                                    )}
                                                >
                                                    {isActive && (
                                                        <motion.div layoutId="active-pill-mobile" className="absolute left-0 w-1 h-8 bg-primary rounded-full" />
                                                    )}
                                                    <div className={cn("p-2 rounded-xl bg-white/5", isActive ? cat.color : "text-muted")}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold uppercase tracking-widest text-left">{cat.title}</span>
                                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Desktop: Sidebar Navigation */}
                        <div className="hidden md:block w-64 border-r border-white/5 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                            {categories.map((cat) => {
                                const Icon = ICON_MAP[cat.icon] || Star;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setActiveCategory(cat.id);
                                            setIsManagingCategories(false);
                                            if (isEditing) setEditingLesson(null);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                            activeCategory === cat.id && !isManagingCategories
                                                ? "bg-white/10 text-white shadow-lg"
                                                : "text-muted hover:text-white/80 hover:bg-white/5"
                                        )}
                                    >
                                        {activeCategory === cat.id && !isManagingCategories && (
                                            <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-primary rounded-full" />
                                        )}
                                        <Icon className={cn("w-5 h-5", activeCategory === cat.id ? cat.color : "opacity-40")} />
                                        <span className="text-sm font-black uppercase tracking-tight text-left">{cat.title}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 custom-scrollbar bg-dots-pattern">
                            {isManagingCategories ? (
                                <CategoryManager
                                    categories={categories}
                                    onUpdate={fetchCategoriesAndLessons}
                                />
                            ) : loading && (!isEditing || (isEditing && !editingLesson)) ? (
                                <div className="space-y-16 animate-pulse">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="h-8 w-48 bg-white/10 rounded-xl" />
                                                <div className="h-4 w-96 bg-white/5 rounded-lg" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                                {[1, 2].map((j) => (
                                                    <div key={j} className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/5 border border-white/5 h-64 flex flex-col gap-4">
                                                        <div className="w-full aspect-video bg-white/5 rounded-2xl" />
                                                        <div className="h-6 w-3/4 bg-white/5 rounded-lg" />
                                                        <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : isEditing ? (
                                <AdminEditor
                                    lesson={editingLesson}
                                    onSave={handleSaveLesson}
                                    onChange={setEditingLesson}
                                    activeCategory={activeCategory}
                                    existingLessons={activeLessons}
                                    onDelete={handleDeleteLesson}
                                    onEdit={setEditingLesson}
                                />
                            ) : (
                                <LessonViewer lessons={activeLessons} category={currentCategory} />
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 md:px-8 md:py-6 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 mb-safe">
                        <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-muted tracking-[0.2em]">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Ангилал: {currentCategory?.title}
                        </div>
                        <div className="flex gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-all bg-white/5 md:bg-transparent"
                            >
                                Хаах
                            </button>
                            <button
                                onClick={() => {
                                    const nextIdx = (categories.findIndex(s => s.id === activeCategory) + 1) % categories.length;
                                    setActiveCategory(categories[nextIdx].id);
                                }}
                                className="flex-1 md:flex-none px-6 md:px-10 py-3 rounded-xl md:rounded-2xl bg-primary text-white text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Дараах
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div >
            </div >
        </AnimatePresence >
    );
}

// --- SUB-COMPONENTS ---

function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    const divRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setOpacity(1);
    };

    const handleBlur = () => {
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden",
                className
            )}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
}

function CategoryManager({ categories, onUpdate }: { categories: Category[], onUpdate: () => void }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Category>>({});

    const handleEdit = (cat: Category) => {
        setEditingId(cat.id);
        setFormData(cat);
    };

    const handleNew = () => {
        setEditingId('new');
        setFormData({ id: '', title: '', icon: 'Star', color: 'text-white', order_index: categories.length });
    };

    const handleSave = async () => {
        if (!formData.id || !formData.title) {
            toast.error('ID болон Гарчиг заавал байх ёстой');
            return;
        }

        const dataToSave = {
            id: formData.id.toLowerCase().replace(/\s+/g, '-'),
            title: formData.title,
            icon: formData.icon,
            color: formData.color,
            order_index: formData.order_index
        };

        let res;
        if (editingId === 'new') {
            res = await supabase.from('editor_academy_categories').insert([dataToSave]);
        } else {
            res = await supabase.from('editor_academy_categories').update(dataToSave).eq('id', editingId);
        }

        if (res.error) toast.error('Алдаа: ' + res.error.message);
        else {
            toast.success('Хадгалагдлаа');
            setEditingId(null);
            onUpdate();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Энэ ангиллыг устгах уу? Анхаар: Энэ ангилалд байгаа хичээлүүд устаж магадгүй.')) return;
        const { error } = await supabase.from('editor_academy_categories').delete().eq('id', id);
        if (error) toast.error('Алдаа: ' + error.message);
        else {
            toast.success('Устгагдлаа');
            onUpdate();
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter">Ангилал удирдах</h3>
                <button
                    onClick={handleNew}
                    className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Шинэ ангилал
                </button>
            </div>

            {editingId && (
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h4 className="text-sm font-black text-muted uppercase tracking-widest mb-4">
                        {editingId === 'new' ? 'Шинэ ангилал' : 'Ангилал засах'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-muted font-bold">ID (Slug)</label>
                            <input
                                value={formData.id || ''}
                                onChange={e => setFormData({ ...formData, id: e.target.value })}
                                disabled={editingId !== 'new'}
                                placeholder="tools-v2"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-muted font-bold">Гарчиг</label>
                            <input
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Шинэ хэрэгсэл"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-muted font-bold">Icon (Lucide Name)</label>
                            <select
                                value={formData.icon || 'Star'}
                                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                            >
                                {Object.keys(ICON_MAP).map(icon => (
                                    <option key={icon} value={icon}>{icon}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-muted font-bold">Өнгө (Tailwind)</label>
                            <input
                                value={formData.color || ''}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                placeholder="text-red-500"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 text-muted text-xs font-bold uppercase hover:text-white">Болих</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase">Хадгалах</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {categories.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || Star;
                    return (
                        <div key={cat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/5", cat.color)}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{cat.title}</h4>
                                    <p className="text-[10px] text-muted font-mono">{cat.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-white/10 rounded-lg text-white"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50, damping: 15 } }
};

function LessonViewer({ lessons, category }: { lessons: Lesson[], category: any }) {
    if (!category) return null;
    const Icon = ICON_MAP[category.icon] || Star;

    if (lessons.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center">
                    <Icon className="w-10 h-10 text-muted/20" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic mb-2">Одоогоор хичээл байхгүй</h3>
                    <p className="text-muted text-sm max-w-xs font-bold uppercase tracking-widest text-[10px]">Энэ ангилалд админ хичээл оруулаагүй байна.</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-16"
        >
            {lessons.map((lesson) => (
                <motion.div key={lesson.id} variants={itemVariants} className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2 md:gap-3">
                            <Icon className={cn("w-6 h-6 md:w-8 md:h-8", category.color)} />
                            {lesson.title}
                        </h3>
                        {lesson.description && (
                            <p className="text-muted leading-relaxed max-w-2xl font-medium">{lesson.description}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        {lesson.content.map((item, idx) => (
                            <SpotlightCard key={idx} className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-surface border border-white/5 hover:border-primary/20 transition-all group overflow-hidden h-full">
                                {item.image_url ? (
                                    <div className="mb-6 rounded-2xl overflow-hidden aspect-video border border-white/10 relative">
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {/* Content Type Badge */}
                                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ImageIcon className="w-3 h-3 text-white" />
                                            <span className="text-[9px] font-black uppercase text-white tracking-widest">Image</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                        <TextQuote className="w-4 h-4" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter italic group-hover:text-primary transition-colors">{item.title}</h4>
                                    <p className="text-muted text-sm leading-relaxed line-clamp-3">{item.desc}</p>
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>

                    {lesson.video_url && (
                        <div className="w-full rounded-[2.5rem] overflow-hidden border border-white/5 bg-black/40 shadow-2xl relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />
                            <div className="relative">
                                {/* Smart Video Player */}
                                {(() => {
                                    const url = lesson.video_url || '';
                                    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                                    const isLoom = url.includes('loom.com');
                                    const isDirectFile = url.match(/\.(mp4|webm|ogg|mov)$/i);

                                    if (isYoutube) {
                                        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
                                        return (
                                            <div className="aspect-video w-full">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${videoId}`}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        );
                                    }

                                    if (isLoom) {
                                        // Convert 'share' to 'embed' for Loom
                                        const embedUrl = url.replace('/share/', '/embed/');
                                        return (
                                            <div className="aspect-video w-full">
                                                <iframe
                                                    src={embedUrl}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                />
                                            </div>
                                        );
                                    }

                                    if (isDirectFile) {
                                        return (
                                            <video
                                                src={url}
                                                controls
                                                className="w-full h-auto max-h-[600px]"
                                                preload="metadata"
                                            >
                                                Таны хөтөч видео тоглуулахыг дэмжихгүй байна.
                                            </video>
                                        );
                                    }

                                    // Fallback for Zoom, Vimeo, etc. (Try Generic Iframe)
                                    return (
                                        <div className="aspect-video w-full relative">
                                            <iframe
                                                src={url}
                                                className="w-full h-full"
                                                allowFullScreen
                                            />
                                            <div className="absolute top-2 right-2 px-3 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] text-muted pointer-events-none">
                                                External Embed
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </motion.div>
            ))}
        </motion.div>
    );
}

function AdminEditor({ lesson, onSave, onChange, activeCategory, existingLessons, onDelete, onEdit }: any) {
    const defaultItem = { title: '', desc: '' };
    const content = lesson?.content || [];
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

    const updateItem = (idx: number, updates: any) => {
        const newContent = [...content];
        newContent[idx] = { ...newContent[idx], ...updates };
        onChange({ ...lesson, content: newContent });
    };

    const addItem = () => {
        onChange({ ...lesson, content: [...content, defaultItem] });
    };

    const removeItem = (idx: number) => {
        onChange({ ...lesson, content: content.filter((_: any, i: number) => i !== idx) });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIdx(idx);
        try {
            // Use Server Action for R2 Upload
            const { uploadAcademyImage } = await import('@/app/actions/upload-academy-image');

            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadAcademyImage(formData);

            if (!result.success) throw new Error(result.error);

            updateItem(idx, { image_url: result.url });
            toast.success('Зураг R2 руу амжилттай хуулагдлаа');
        } catch (error: any) {
            toast.error('Зураг оруулахад алдаа: ' + error.message);
        } finally {
            setUploadingIdx(null);
        }
    };

    return (
        <div className="space-y-12">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                    {lesson?.id ? 'Хичээл засах' : 'Шинэ хичээл нэмэх'}
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => onEdit(null)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase transition-all"
                    >
                        Буцах
                    </button>
                    <button
                        onClick={onSave}
                        className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Save className="w-4 h-4" />
                        Хадгалах
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form Side */}
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted italic ml-2">Гарчиг</label>
                        <input
                            type="text"
                            value={lesson?.title || ''}
                            onChange={(e) => onChange({ ...lesson, title: e.target.value })}
                            placeholder="Жишээ: Cleaner Mode 2.0"
                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-muted/30 focus:border-primary outline-none transition-all font-bold text-sm"
                        />
                    </div>

                    {/* NEW: Video URL Input */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted italic ml-2">Видео заавар (URL)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={lesson?.video_url || ''}
                                onChange={(e) => onChange({ ...lesson, video_url: e.target.value })}
                                placeholder="https://youtube.com/watch?v=... эсвэл шууд mp4 холбоос"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 pl-12 text-white placeholder:text-muted/30 focus:border-primary outline-none transition-all font-medium text-sm"
                            />
                            <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-primary transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted italic ml-2">Тайлбар</label>
                        <textarea
                            value={lesson?.description || ''}
                            onChange={(e) => onChange({ ...lesson, description: e.target.value })}
                            placeholder="Хичээлийн товч танилцуулга..."
                            className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-muted/30 focus:border-primary outline-none transition-all resize-none font-medium text-sm"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted italic">Агуулгын хэсгүүд</label>
                            <button onClick={addItem} className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 hover:scale-105 transition-all bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                                <Plus className="w-3.5 h-3.5" /> Хэсэг нэмэх
                            </button>
                        </div>

                        <div className="space-y-4">
                            {content.map((item: any, idx: number) => (
                                <div key={idx} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {/* Image Upload Area */}
                                    <div className="w-full mb-2">
                                        {item.image_url ? (
                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 group/img">
                                                <img src={item.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => updateItem(idx, { image_url: '' })}
                                                    className="absolute bottom-2 right-2 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group/upload">
                                                {uploadingIdx === idx ? (
                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                ) : (
                                                    <>
                                                        <ImagePlus className="w-8 h-8 text-muted group-hover/upload:text-primary mb-2 transition-colors" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover/upload:text-white transition-colors">Зураг оруулах (R2)</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageUpload(e, idx)}
                                                    disabled={uploadingIdx === idx}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                                        placeholder="Хэсгийн гарчиг"
                                        className="w-full bg-transparent text-sm font-black text-white outline-none placeholder:text-muted/20 italic uppercase tracking-tighter"
                                    />
                                    <textarea
                                        value={item.desc}
                                        onChange={(e) => updateItem(idx, { desc: e.target.value })}
                                        placeholder="Хэсгийн тайлбар"
                                        className="w-full bg-transparent text-xs text-muted outline-none placeholder:text-muted/20 resize-none h-20 font-medium"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List Side */}
                <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted italic ml-2">Одоо байгаа хичээлүүд</label>
                    <div className="space-y-3">
                        {existingLessons.map((l: Lesson) => (
                            <div key={l.id} className="group flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <GripVertical className="w-4 h-4 text-muted/20 group-hover:text-muted transition-colors" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white uppercase tracking-tight italic">{l.title}</span>
                                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">{l.content?.length || 0} хэсэгтэй</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => onEdit(l)}
                                        className="p-3 hover:bg-primary/20 text-primary rounded-xl transition-colors border border-primary/20"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(l.id)}
                                        className="p-3 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {existingLessons.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20">
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Ангилал хоосон байна</p>
                            </div>
                        )}
                        <button
                            onClick={() => onEdit({ title: '', description: '', content: [] })}
                            className="w-full py-6 mt-4 border-2 border-dashed border-primary/20 rounded-[3rem] text-primary font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary/5 transition-all hover:border-primary/40 flex items-center justify-center gap-3"
                        >
                            <Plus className="w-5 h-5" />
                            Шинэ хичээл нэмэх
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

