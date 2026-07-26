"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Layout,
    Plus,
    GripVertical,
    Eye,
    EyeOff,
    Trash2,
    Save,
    Loader2,
    Settings2,
    Check,
    Search,
    Sparkles,
    Calendar,
    BookOpen,
    Zap,
    MousePointer2,
    Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, Reorder, AnimatePresence, useDragControls } from "framer-motion";

interface HomepageSection {
    id: number;
    title: string;
    type: string;
    order_index: number;
    is_visible: boolean;
    metadata: any;
}

interface SortableSectionItemProps {
    section: HomepageSection;
    onToggleVisibility: (id: number, current: boolean) => void;
    onDelete: (id: number) => void;
    onEdit: (section: HomepageSection) => void;
    onPreview: (section: HomepageSection) => void;
}

function SortableSectionItem({ section, onToggleVisibility, onDelete, onEdit, onPreview }: SortableSectionItemProps) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={section}
            dragListener={false}
            dragControls={controls}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileDrag={{
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                backgroundColor: "rgba(30,30,30,1)",
                zIndex: 100
            }}
            className={cn(
                "group bg-surface border border-white/5 p-4 rounded-3xl flex items-center gap-4 transition-colors duration-200",
                !section.is_visible && "opacity-50 grayscale"
            )}
        >
            <div
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab active:cursor-grabbing p-3 text-muted hover:text-white transition-all touch-none bg-white/5 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary active:scale-90 active:bg-primary/20"
            >
                <GripVertical className="w-5 h-5 transition-transform group-active:rotate-12" />
            </div>

            <div className="flex-1">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base">
                    {section.title}
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black uppercase tracking-widest text-muted">
                        {section.type}
                    </span>
                </h3>
                <p className="text-[10px] text-muted/60 uppercase tracking-widest">
                    {section.type === 'genre_specific' ? `Genre: ${section.metadata?.genre}` :
                        section.type === 'manual_selection' ? `${section.metadata?.webtoon_ids?.length || 0} Webtoons` :
                            'Dynamic Content'}
                </p>
            </div>

            <div className="flex items-center gap-2 pr-2">
                <button
                    onClick={() => onPreview(section)}
                    className="p-2.5 rounded-xl bg-white/5 text-muted hover:text-white transition-all"
                    title="Урьдчилан харах"
                >
                    <Eye className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onToggleVisibility(section.id, section.is_visible)}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        section.is_visible ? "bg-primary/10 text-primary" : "bg-white/5 text-muted"
                    )}
                    title={section.is_visible ? "Нуух" : "Харуулах"}
                >
                    {section.is_visible ? <Check className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => onEdit(section)}
                    className="p-2.5 rounded-xl bg-white/5 text-muted hover:text-white transition-all"
                    title="Тохиргоо"
                >
                    <Settings2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(section.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all ml-2 md:ml-4"
                    title="Устгах"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </Reorder.Item>
    );
}

export default function HomepageManagement() {
    const [sections, setSections] = useState<HomepageSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newSection, setNewSection] = useState({
        title: "",
        type: "manual_selection",
        is_visible: true
    });

    const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
    const [previewSection, setPreviewSection] = useState<HomepageSection | null>(null);
    const [previewItems, setPreviewItems] = useState<any[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchGenre, setSearchGenre] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [showPicker, setShowPicker] = useState(false);
    const [allWebtoons, setAllWebtoons] = useState<any[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);
    const [selectedWebtoonsInfo, setSelectedWebtoonsInfo] = useState<any[]>([]);

    // Fetch details for selected webtoons when editing manual selection
    useEffect(() => {
        if (editingSection?.type === 'manual_selection' && editingSection.metadata?.webtoon_ids?.length > 0) {
            fetchSelectedDetails(editingSection.metadata.webtoon_ids);
        }
    }, [editingSection?.id]); // Only refetch when changing sections

    async function fetchSelectedDetails(ids: string[]) {
        const { data } = await supabase
            .from('webtoons')
            .select('id, title, image, genres')
            .in('id', ids);
        
        if (data) setSelectedWebtoonsInfo(data);
    }

    useEffect(() => {
        fetchSections();
    }, []);

    async function fetchSections() {
        setLoading(true);
        const { data, error } = await supabase
            .from('homepage_sections')
            .select('*')
            .order('order_index', { ascending: true });

        if (!error && data) {
            setSections(data);
        }
        setLoading(false);
    }

    async function handleReorder(newOrder: HomepageSection[]) {
        setSections(newOrder);
    }

    async function saveOrder() {
        setSaving(true);
        const updates = sections.map((s, index) => ({
            id: s.id,
            order_index: index + 1
        }));

        // Optimized World-Class approach: Single RPC call instead of loop
        const { error } = await supabase.rpc('reorder_homepage_sections', {
            section_updates: updates
        });

        // Fallback if RPC is not yet created by user
        if (error) {
            console.warn("RPC fetch failed, falling back to sequential updates:", error);
            for (const update of updates) {
                await supabase
                    .from('homepage_sections')
                    .update({ order_index: update.order_index })
                    .eq('id', update.id);
            }
        }

        setSaving(false);
        fetchSections();
    }

    async function toggleVisibility(id: number, current: boolean) {
        const { error } = await supabase
            .from('homepage_sections')
            .update({ is_visible: !current })
            .eq('id', id);

        if (!error) {
            setSections(prev => prev.map(s => s.id === id ? { ...s, is_visible: !current } : s));
        }
    }

    async function deleteSection(id: number) {
        if (!confirm("Энэ хэсгийг устгахдаа итгэлтэй байна уу?")) return;

        const { error } = await supabase
            .from('homepage_sections')
            .delete()
            .eq('id', id);

        if (!error) {
            setSections(prev => prev.filter(s => s.id !== id));
        }
    }

    async function addSection() {
        if (!newSection.title) return;

        const { data, error } = await supabase
            .from('homepage_sections')
            .insert([{
                ...newSection,
                order_index: sections.length + 1
            }])
            .select()
            .single();

        if (!error && data) {
            setSections(prev => [...prev, data]);
            setIsAdding(false);
            setNewSection({ title: "", type: "manual_selection", is_visible: true });
        }
    }

    async function handlePreview(section: HomepageSection) {
        setPreviewSection(section);
        setLoadingPreview(true);
        setPreviewItems([]);

        let query = supabase.from('webtoons').select('*').limit(10);

        if (section.type === 'genre_specific' && section.metadata?.genre) {
            query = query.contains('genres', [section.metadata.genre]);
        } else if (section.type === 'manual_selection' && section.metadata?.webtoon_ids?.length > 0) {
            query = query.in('id', section.metadata.webtoon_ids);
        } else if (section.type === 'new_updates') {
            query = query.eq('is_new', true);
        } else {
            query = query.order('rating', { ascending: false });
        }

        const { data } = await query;
        setPreviewItems(data || []);
        setLoadingPreview(false);
    }

    async function fetchAllWebtoons() {
        setLoadingAll(true);
        setShowPicker(true);
        const { data } = await supabase.from('webtoons').select('*').order('title', { ascending: true });
        setAllWebtoons(data || []);
        setLoadingAll(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-40">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Нүүр хуудас</h2>
                    <p className="text-muted">Хэсгүүдийн дараалал болон харагдах байдал</p>
                </div>
                <div className="flex gap-3 md:gap-4">
                    <button
                        onClick={saveOrder}
                        disabled={saving}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Хадгалах
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        Нэмэх
                    </button>
                </div>
            </div>

            <Reorder.Group axis="y" values={sections} onReorder={handleReorder} className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {sections.map((section) => (
                        <SortableSectionItem
                            key={section.id}
                            section={section}
                            onToggleVisibility={toggleVisibility}
                            onDelete={deleteSection}
                            onEdit={(s) => setEditingSection(s)}
                            onPreview={handlePreview}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewSection && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewSection(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-5xl bg-surface border border-white/10 rounded-[40px] p-12 shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">{previewSection.title}</h3>
                                    <p className="text-muted text-xs uppercase tracking-[0.2em]">{previewSection.type}</p>
                                </div>
                                <button
                                    onClick={() => setPreviewSection(null)}
                                    className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-muted hover:text-white"
                                >
                                    Хаах
                                </button>
                            </div>

                            {loadingPreview ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Дата уншиж байна...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-h-[60vh] overflow-y-auto pr-4 no-scrollbar">
                                    {previewItems.length > 0 ? previewItems.map((item) => (
                                        <div key={item.id} className="group flex flex-col gap-3">
                                            <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/5 relative">
                                                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <h4 className="text-[11px] font-bold text-white/90 line-clamp-2 uppercase tracking-tight">{item.title}</h4>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-20 text-center text-muted uppercase tracking-widest text-xs opacity-50">
                                            Энэ хэсэгт вэбтүүн байхгүй байна
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Section Metadata / Settings Overlay */}
            <AnimatePresence>
                {editingSection && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingSection(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-white/10 shadow-2xl p-8 overflow-y-auto no-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Тохиргоо</h3>
                                <button
                                    onClick={() => setEditingSection(null)}
                                    className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    <Plus className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        Хэсгийн нэр
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-4 px-6 rounded-2xl text-white outline-none transition-all"
                                        value={editingSection.title}
                                        onChange={e => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        Төрөл
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            'recommendations', 'seasonal', 'continue_reading', 'new_updates', 'manual_selection', 'genre_specific'
                                        ].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setEditingSection(prev => prev ? { ...prev, type: t } : null)}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all",
                                                    editingSection.type === t
                                                        ? "bg-primary border-primary text-white"
                                                        : "bg-white/5 border-white/5 text-muted hover:bg-white/10"
                                                )}
                                            >
                                                {t.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {editingSection.type === 'genre_specific' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                                            Жанр сонгох
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {["Action", "Adventure", "Fantasy", "Mystery", "Drama", "Romance", "Comedy", "Supernatural", "Historical"].map(genre => (
                                                <button
                                                    key={genre}
                                                    onClick={() => setEditingSection(prev => prev ? {
                                                        ...prev,
                                                        metadata: { ...prev.metadata, genre }
                                                    } : null)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl border text-[10px] font-black transition-all",
                                                        editingSection.metadata?.genre === genre
                                                            ? "bg-white text-black border-white"
                                                            : "bg-white/5 text-white/50 border-white/5 hover:border-white/10"
                                                    )}
                                                >
                                                    {genre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {editingSection.type === 'manual_selection' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                                            Вэбтүүн сонгох
                                        </label>

                                        {/* Selected Webtoons Chips (Reorderable) */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <p className="text-[9px] text-muted uppercase tracking-widest font-black">Сонгосон (Дарааллыг чирж солих боломжтой)</p>
                                                {editingSection.metadata?.webtoon_ids?.length > 0 && (
                                                    <button 
                                                        onClick={() => setEditingSection(prev => prev ? { ...prev, metadata: { ...prev.metadata, webtoon_ids: [] } } : null)}
                                                        className="text-[9px] text-red-500 font-bold uppercase hover:underline"
                                                    >
                                                        Бүгдийг устгах
                                                    </button>
                                                )}
                                            </div>
                                            <Reorder.Group 
                                                axis="y" 
                                                values={editingSection.metadata?.webtoon_ids || []} 
                                                onReorder={(newOrder) => {
                                                    setEditingSection(prev => prev ? { ...prev, metadata: { ...prev.metadata, webtoon_ids: newOrder } } : null);
                                                }}
                                                className="space-y-2 mb-6"
                                            >
                                                <AnimatePresence mode="popLayout">
                                                    {editingSection.metadata?.webtoon_ids?.map((id: string) => {
                                                        // Priority: Check newly fetched selected info, then allWebtoons, then searchResults
                                                        const webtoonInfo = selectedWebtoonsInfo?.find(w => w.id.toString() === id.toString()) || 
                                                                           allWebtoons?.find(w => w.id.toString() === id.toString()) || 
                                                                           searchResults?.find(w => w.id.toString() === id.toString());
                                                        
                                                        return (
                                                            <Reorder.Item 
                                                                key={id} 
                                                                value={id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                whileDrag={{ 
                                                                    scale: 1.02, 
                                                                    zIndex: 50,
                                                                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                                                                }}
                                                            >
                                                                <div className="group/chip flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-2xl transition-all">
                                                                    <div className="cursor-grab active:cursor-grabbing p-2 text-muted/30 group-hover/chip:text-primary transition-colors">
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    
                                                                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                                                                        {webtoonInfo?.image && (
                                                                            <img src={webtoonInfo.image} className="w-full h-full object-cover" alt="" />
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-[10px] font-black uppercase tracking-tight truncate">
                                                                            {webtoonInfo?.title || `ID: ${id}`}
                                                                        </div>
                                                                        <div className="text-[8px] text-muted uppercase tracking-widest">
                                                                            ID: {id}
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingSection(prev => {
                                                                                if (!prev) return null;
                                                                                const ids = prev.metadata?.webtoon_ids?.filter((wid: string) => wid !== id) || [];
                                                                                return { ...prev, metadata: { ...prev.metadata, webtoon_ids: ids } };
                                                                            });
                                                                        }}
                                                                        className="p-3 rounded-xl hover:bg-red-500/20 text-muted hover:text-red-500 transition-all"
                                                                    >
                                                                        <Plus className="w-4 h-4 rotate-45" />
                                                                    </button>
                                                                </div>
                                                            </Reorder.Item>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </Reorder.Group>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Вэбтүүн хайх..."
                                                    className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-3 px-6 rounded-xl text-white outline-none text-xs"
                                                    value={searchQuery}
                                                    onChange={async (e) => {
                                                        const query = e.target.value;
                                                        setSearchQuery(query);
                                                        if (query.length > 1) {
                                                            setIsSearching(true);
                                                            const { data } = await supabase
                                                                .from('webtoons')
                                                                .select('id, title, image, genres')
                                                                .ilike('title', `%${query}%`)
                                                                .limit(5);
                                                            setSearchResults(data || []);
                                                            setIsSearching(false);
                                                        } else {
                                                            setSearchResults([]);
                                                        }
                                                    }}
                                                />
                                                {isSearching && <Loader2 className="absolute right-4 top-3 w-4 h-4 text-primary animate-spin" />}
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-[400px] overflow-y-auto no-scrollbar">
                                                    {searchResults.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => {
                                                                setEditingSection(prev => {
                                                                    if (!prev) return null;
                                                                    const ids = [...(prev.metadata?.webtoon_ids || []), w.id];
                                                                    return { ...prev, metadata: { ...prev.metadata, webtoon_ids: Array.from(new Set(ids)) } };
                                                                });
                                                                // Also add to our detailed info state so it shows up in the list immediately
                                                                setSelectedWebtoonsInfo(prev => {
                                                                    if (prev.find(item => item.id === w.id)) return prev;
                                                                    return [...prev, w];
                                                                });
                                                                setSearchQuery("");
                                                                setSearchResults([]);
                                                                setSearchGenre(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center gap-4"
                                                        >
                                                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                                                <img src={w.image} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[11px] font-bold uppercase tracking-wider text-white truncate">{w.title}</div>
                                                                <div className="text-[9px] text-muted truncate">{w.genres?.join(', ')}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {searchQuery === "" && (
                                                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex items-center justify-between mb-3 px-1">
                                                        <p className="text-[9px] text-muted uppercase tracking-widest">Ангиллаар харах:</p>
                                                        {searchGenre && (
                                                            <button
                                                                onClick={() => {
                                                                    setSearchGenre(null);
                                                                    setSearchResults([]);
                                                                }}
                                                                className="text-[9px] text-primary font-bold uppercase"
                                                            >
                                                                Цэвэрлэх
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mb-6">
                                                        {["Action", "Romance", "Fantasy", "Drama"].map(g => (
                                                            <button
                                                                key={g}
                                                                onClick={async () => {
                                                                    setSearchGenre(g);
                                                                    setIsSearching(true);
                                                                    const { data } = await supabase
                                                                        .from('webtoons')
                                                                        .select('id, title, image, genres')
                                                                        .contains('genres', [g])
                                                                        .limit(20);
                                                                    setSearchResults(data || []);
                                                                    setIsSearching(false);
                                                                }}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all",
                                                                    searchGenre === g
                                                                        ? "bg-primary border-primary text-white"
                                                                        : "bg-white/5 border-white/5 text-muted hover:border-white/10"
                                                                )}
                                                            >
                                                                {g}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {!searchGenre && (
                                                        <div className="space-y-3 pt-2">
                                                            <button
                                                                onClick={async () => {
                                                                    setIsSearching(true);
                                                                    const { data } = await supabase.from('webtoons').select('id, title, image, genres').limit(50);
                                                                    setSearchResults(data || []);
                                                                    setIsSearching(false);
                                                                }}
                                                                className="w-full py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:border-primary/30 hover:text-white transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Search className="w-3 h-3" />
                                                                Бүх вэбтүүнийг харах (Top 50)
                                                            </button>

                                                            <button
                                                                onClick={fetchAllWebtoons}
                                                                className="w-full py-4 bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,59,48,0.1)]"
                                                            >
                                                                <Layout className="w-3 h-3" />
                                                                Визуал сонгогч ашиглах
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 space-y-3">
                                    <button
                                        onClick={async () => {
                                            const { error } = await supabase
                                                .from('homepage_sections')
                                                .update({
                                                    title: editingSection.title,
                                                    type: editingSection.type,
                                                    metadata: editingSection.metadata
                                                })
                                                .eq('id', editingSection.id);

                                            if (!error) {
                                                setSections(prev => prev.map(s => s.id === editingSection.id ? editingSection : s));
                                                setEditingSection(null);
                                            }
                                        }}
                                        className="w-full py-5 bg-primary text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-primary-hover transition-all shadow-xl shadow-primary/20"
                                    >
                                        Өөрчлөлтийг хадгалах
                                    </button>
                                    <p className="text-center text-[9px] text-muted uppercase tracking-widest opacity-50">Бүх өөрчлөлт шууд хадгалагдана</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdding(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-xl bg-surface border border-white/10 rounded-[40px] p-10 shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Шинэ хэсэг нэмэх</h3>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        Хэсгийн нэр
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Жишээ: Шинээр нэмэгдсэн"
                                        className="w-full bg-white/5 border border-white/5 focus:border-primary/50 py-5 px-8 rounded-[24px] text-white outline-none transition-all placeholder:text-muted/30 focus:bg-white/10"
                                        value={newSection.title}
                                        onChange={e => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        Төрөл сонгох
                                    </label>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'recommendations', label: 'Танд санал болгох', icon: Sparkles },
                                            { id: 'seasonal', label: 'Энэ улиралд', icon: Calendar },
                                            { id: 'continue_reading', label: 'Үргэлжлүүлэн унших', icon: BookOpen },
                                            { id: 'new_updates', label: 'Шинээр нэмэгдсэн', icon: Zap },
                                            { id: 'manual_selection', label: 'Гараар сонгох', icon: MousePointer2 },
                                            { id: 'genre_specific', label: 'Төрлөөр шүүх', icon: Tag },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setNewSection(prev => ({ ...prev, type: opt.id }))}
                                                className={cn(
                                                    "group flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-[32px] border text-[10px] font-black uppercase tracking-widest transition-all text-center relative overflow-hidden",
                                                    newSection.type === opt.id
                                                        ? "bg-primary border-primary text-white shadow-2xl shadow-primary/40 scale-[1.02]"
                                                        : "bg-white/5 border-white/5 text-muted hover:border-white/10 hover:bg-white/10 hover:scale-[1.01]"
                                                )}
                                            >
                                                <opt.icon className={cn(
                                                    "w-6 h-6 transition-transform duration-500",
                                                    newSection.type === opt.id ? "scale-110" : "group-hover:scale-110 opacity-40"
                                                )} />
                                                {opt.label}

                                                {newSection.type === opt.id && (
                                                    <motion.div
                                                        layoutId="activeGlow"
                                                        className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-5 bg-white/5 text-muted hover:text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest border border-white/5 hover:border-white/10 transition-all"
                                    >
                                        Цуцлах
                                    </button>
                                    <button
                                        onClick={addSection}
                                        disabled={!newSection.title || !newSection.type}
                                        className="flex-1 py-5 bg-primary text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale"
                                    >
                                        Хэсгийг нэмэх
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Advanced Webtoon Picker Modal */}
            <AnimatePresence>
                {showPicker && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPicker(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-7xl h-full bg-surface border border-white/10 rounded-[48px] shadow-2xl relative z-10 overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-8 md:p-12 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-2">Вэбтүүн сонгох</h3>
                                    <p className="text-muted text-sm font-medium uppercase tracking-[0.2em]">Нийт {allWebtoons.length} вэбтүүнээс сонголтоо хийнэ үү</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                                            {editingSection?.metadata?.webtoon_ids?.length || 0} сонгосон
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowPicker(false)}
                                        className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/90 transition-all"
                                    >
                                        Хадгалах
                                    </button>
                                </div>
                            </div>

                            {/* Grid Content */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar">
                                {loadingAll ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 text-muted">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Түр хүлээнэ үү...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                        {allWebtoons.map((w) => {
                                            const isSelected = editingSection?.metadata?.webtoon_ids?.includes(w.id);
                                            return (
                                                <button
                                                    key={w.id}
                                                    onClick={() => {
                                                        if (!editingSection) return;
                                                        const currentIds = editingSection.metadata?.webtoon_ids || [];
                                                        const newIds = isSelected
                                                            ? currentIds.filter((id: string) => id !== w.id)
                                                            : [...currentIds, w.id];

                                                        setEditingSection({
                                                            ...editingSection,
                                                            metadata: { ...editingSection.metadata, webtoon_ids: newIds }
                                                        });
                                                    }}
                                                    className={cn(
                                                        "group flex flex-col gap-3 text-left transition-all duration-300",
                                                        isSelected ? "scale-100" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:scale-[1.02]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "aspect-[2/3] rounded-[32px] overflow-hidden relative border-4 transition-all duration-500",
                                                        isSelected ? "border-primary shadow-[0_0_40px_rgba(255,59,48,0.4)]" : "border-white/5"
                                                    )}>
                                                        <img src={w.image} alt={w.title} className="w-full h-full object-cover" />

                                                        {/* Selection Overlay */}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-2xl scale-110 animate-in zoom-in duration-300">
                                                                    <Check className="w-6 h-6 text-primary stroke-[4]" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="px-2">
                                                        <h4 className={cn(
                                                            "text-[12px] font-black line-clamp-2 uppercase tracking-tight transition-colors",
                                                            isSelected ? "text-primary" : "text-white/80"
                                                        )}>
                                                            {w.title}
                                                        </h4>
                                                        <p className="text-[9px] text-muted font-bold uppercase mt-1">
                                                            {w.genres?.[0] || 'Webtoon'}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
