"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WebtoonCard } from "./WebtoonCard";
import { ContinueReadingCard } from "./ContinueReadingCard";
import { ChevronRight } from "lucide-react";
import { WebtoonSectionSkeleton } from "./WebtoonCardSkeleton";
import { motion, AnimatePresence } from "framer-motion";

interface HomepageSectionsProps {
    webtoons: any[];
    recommendations: any[];
    continueReading: any[];
    latestUpdates: any[];
    router: any;
    initialSections?: any[];
    recentUpdateIds?: any[];
}

export function HomepageSections({
    webtoons,
    recommendations,
    continueReading,
    latestUpdates,
    router,
    initialSections,
    recentUpdateIds = []
}: HomepageSectionsProps) {
    const [sections, setSections] = useState<any[]>(initialSections || []);
    const [sectionData, setSectionData] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(!initialSections);

    useEffect(() => {
        async function fetchSpecializedData(sectionsToUse: any[]) {
            const currentSections = sectionsToUse || [];
            if (!currentSections.length) return;

            const dataMap: Record<number, any[]> = {};
            const neededSections = currentSections.filter(s =>
                s.type === 'genre_specific' || s.type === 'manual_selection'
            );

            if (neededSections.length === 0) return;

            // Collect all IDs - Ensure they are numbers for the SQL query
            const allManualIds = Array.from(new Set(
                neededSections
                    .filter(s => s.type === 'manual_selection')
                    .flatMap(s => s.metadata?.webtoon_ids?.map((id: any) => {
                        const parsed = parseInt(id);
                        return isNaN(parsed) ? id : parsed;
                    }) || [])
            ));

            let batchedWebtoons: any[] = [];
            if (allManualIds.length > 0) {
                const { data } = await supabase
                    .from('webtoons')
                    .select('*')
                    .in('id', allManualIds);
                batchedWebtoons = data || [];
            }

            for (const section of neededSections) {
                if (section.type === 'genre_specific' && section.metadata?.genre) {
                    const { data } = await supabase
                        .from('webtoons')
                        .select('*')
                        .contains('genres', [section.metadata.genre])
                        .limit(10);
                    dataMap[section.id] = data || [];
                } else if (section.type === 'manual_selection' && section.metadata?.webtoon_ids) {
                    // CRITICAL FIX: Sort webtoons strictly by the order of IDs in metadata
                    const orderedWebtoons = section.metadata.webtoon_ids
                        .map((id: any) => batchedWebtoons.find(w => w.id.toString() === id.toString()))
                        .filter(Boolean);
                    
                    dataMap[section.id] = orderedWebtoons;
                }
            }

            setSectionData(prev => ({ ...prev, ...dataMap }));
        }

        async function init() {
            if (initialSections && initialSections.length > 0) {
                setLoading(false);
                await fetchSpecializedData(initialSections);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('homepage_sections')
                .select('*')
                .eq('is_visible', true)
                .order('order_index', { ascending: true });

            if (!error && data) {
                setSections(data);
                await fetchSpecializedData(data);
            }
            setLoading(false);
        }

        init();
    }, [initialSections]);

    if (loading) return <><WebtoonSectionSkeleton /><WebtoonSectionSkeleton /></>;

    return (
        <div className="space-y-[10px] pt-2">
            <AnimatePresence mode="popLayout">
                {sections.map((section, sectionIdx) => {
                    let items: any[] = [];
                    let sectionKey = "";

                    switch (section.type) {
                        case 'recommendations':
                            items = recommendations;
                            sectionKey = "recommendations";
                            break;
                        case 'seasonal':
                            items = webtoons.slice(0, 10);
                            sectionKey = "seasonal";
                            break;
                        case 'continue_reading':
                            items = continueReading;
                            sectionKey = "continueReading";
                            break;
                        case 'new_updates':
                            items = latestUpdates;
                            sectionKey = "newUpdates";
                            break;
                        case 'genre_specific':
                            items = sectionData[section.id] || [];
                            sectionKey = `genre&genre=${encodeURIComponent(section.metadata?.genre || "")}`;
                            break;
                        case 'manual_selection':
                            items = sectionData[section.id] || [];
                            sectionKey = `manual&ids=${section.metadata?.webtoon_ids?.join(',')}`;
                            break;
                        default:
                            items = [];
                            sectionKey = "";
                            break;
                    }

                    if (items.length === 0) return null;

                    const isContinueReading = section.type === 'continue_reading' || section.title?.toLowerCase().includes('үргэлжлүүлэн');

                    return (
                        <motion.section
                            key={section.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                        >
                            <div className="flex items-center justify-between mb-4 px-1 group/header">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(255,59,48,0.4)]" />
                                    <h2 className="text-[15px] md:text-[17px] font-black tracking-tighter uppercase text-white group-hover/header:text-primary transition-colors">
                                        {section.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => router.push(`?section=${sectionKey}`, { scroll: false })}
                                    className="text-[9px] font-bold text-muted/50 hover:text-primary transition-all uppercase tracking-widest flex items-center gap-1"
                                >
                                    <span>Бүгдийг үзэх</span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex gap-4 lg:gap-6 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4 snap-x">
                                {items.map((item, idx) => (
                                    <div 
                                        key={item.id + "-" + (item.chapter_id || idx)} 
                                        className="flex-shrink-0 snap-start w-[145px] lg:w-[185px]"
                                    >
                                        {isContinueReading ? (
                                            <ContinueReadingCard
                                                id={item.id}
                                                title={item.title}
                                                image={item.image}
                                                lastReadChapterId={item.last_read_chapter_id || item.last_read_chapter || 1}
                                                lastReadChapterTitle={item.last_read_chapter_title}
                                                totalChapters={item.chapters?.length || (typeof item.chapter_count_label === 'string' ? parseInt(item.chapter_count_label.replace(/\D/g, '')) : 0) || 0}
                                                priority={idx < 4 && sectionIdx === 0}
                                            />
                                        ) : section.type === 'new_updates' ? (
                                            <WebtoonCard
                                                id={item.id}
                                                title={item.title}
                                                rating={item.rating?.toString()}
                                                image={item.image}
                                                chapter={item.chapter_title}
                                                updateBadge={item.chapter_title}
                                                isUpdated={true}
                                                aspect="portrait"
                                                href={`/webtoon/${item.id}/read/${item.chapter_id}`}
                                                priority={idx < 4 && sectionIdx === 0}
                                                status={item.status}
                                            />
                                        ) : (
                                            <WebtoonCard
                                                id={item.id}
                                                title={item.title}
                                                rating={item.rating?.toString()}
                                                image={item.image}
                                                chapter={item.chapter_count_label}
                                                isNew={item.is_new}
                                                isUpdated={recentUpdateIds?.includes(item.id)}
                                                aspect="portrait"
                                                genres={item.genres}
                                                priority={idx < 4 && sectionIdx === 0}
                                                status={item.status}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
