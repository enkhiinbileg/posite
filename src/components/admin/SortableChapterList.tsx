"use client";

import { useState, useMemo } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Search,
    Trash2,
    GripVertical,
    Archive,
    CheckSquare,
    Square,
    Eye,
    MoreVertical
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Chapter {
    id: number;
    title: string;
    date: string;
    // Add other fields if needed
}

interface SortableChapterListProps {
    chapters: Chapter[];
    onReorder: (newChapters: Chapter[]) => void;
    onDelete: (ids: number[]) => void;
}

export function SortableChapterList({ chapters, onReorder, onDelete }: SortableChapterListProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filter chapters based on search
    const filteredChapters = useMemo(() => {
        if (!search) return chapters;
        return chapters.filter(c =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            String(c.id).includes(search)
        );
    }, [chapters, search]);

    const isAllSelected = filteredChapters.length > 0 && selectedIds.length === filteredChapters.length;

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = chapters.findIndex((c) => c.id === active.id);
            const newIndex = chapters.findIndex((c) => c.id === over?.id);
            onReorder(arrayMove(chapters, oldIndex, newIndex));
        }
    }

    function toggleSelect(id: number) {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sId => sId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    }

    function toggleSelectAll() {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredChapters.map(c => c.id));
        }
    }

    function handleBulkDelete() {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} chapters?`)) return;
        onDelete(selectedIds);
        setSelectedIds([]);
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chapters..."
                        className="w-full bg-surface border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-muted/50"
                    />
                </div>

                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl"
                    >
                        <span className="text-primary font-bold text-sm">{selectedIds.length} Selected</span>
                        <div className="h-4 w-px bg-primary/20 mx-2" />
                        <button
                            onClick={handleBulkDelete}
                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-muted"
                            title="Delete Selected"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </div>

            {/* List Header */}
            <div className="flex items-center gap-4 px-6 py-3 text-xs font-black uppercase tracking-widest text-muted border-b border-white/5">
                <button onClick={toggleSelectAll} className="hover:text-white transition-colors">
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                </button>
                <div className="w-8">Sort</div>
                <div className="w-12">ID</div>
                <div className="flex-1">Title</div>
                <div className="w-32">Date</div>
                <div className="w-24 text-right">Actions</div>
            </div>

            {/* Sortable List */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={filteredChapters.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        <AnimatePresence>
                            {filteredChapters.map((chapter) => (
                                <SortableItem
                                    key={chapter.id}
                                    chapter={chapter}
                                    selected={selectedIds.includes(chapter.id)}
                                    onSelect={() => toggleSelect(chapter.id)}
                                    onEdit={() => router.push(`/admin/chapters/${chapter.id}`)}
                                />
                            ))}
                        </AnimatePresence>
                        {filteredChapters.length === 0 && (
                            <div className="p-12 text-center space-y-4 border border-white/5 rounded-3xl bg-surface/50 border-dashed">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted">
                                    <Archive className="w-8 h-8" />
                                </div>
                                <p className="text-muted font-medium">No chapters found</p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

function SortableItem({ chapter, selected, onSelect, onEdit }: {
    chapter: Chapter;
    selected: boolean;
    onSelect: () => void;
    onEdit: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: chapter.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        position: isDragging ? "relative" as const : "static" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-4 p-4 rounded-2xl border transition-all
                ${selected ? "bg-primary/5 border-primary/20" : "bg-surface border-white/5 hover:border-white/10 hover:bg-white/5"}
                ${isDragging ? "opacity-50 scale-[1.02] shadow-xl" : ""}
            `}
        >
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <button onClick={onSelect} className="text-muted hover:text-white transition-colors">
                    {selected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                </button>
            </div>

            <div
                {...attributes}
                {...listeners}
                className="w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted hover:text-white transition-colors"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="w-12 font-black text-muted group-hover:text-primary transition-colors">
                No.{chapter.id}
            </div>

            <div className="flex-1 font-bold text-white group-hover:text-primary transition-colors truncate">
                {chapter.title}
            </div>

            <div className="w-32 text-xs text-muted font-medium uppercase tracking-wider">
                {new Date(chapter.date).toLocaleDateString()}
            </div>

            <div className="flex items-center justify-end gap-2 w-24">
                <button
                    onClick={onEdit}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                    title="Edit"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
