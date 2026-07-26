'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WebtoonCard } from './WebtoonCard';
import { ChevronRight, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = [
    { id: 1, name: 'Даваа', eng: 'Monday' },
    { id: 2, name: 'Мягмар', eng: 'Tuesday' },
    { id: 3, name: 'Лхагва', eng: 'Wednesday' },
    { id: 4, name: 'Пүрэв', eng: 'Thursday' },
    { id: 5, name: 'Баасан', eng: 'Friday' },
    { id: 6, name: 'Бямба', eng: 'Saturday' },
    { id: 0, name: 'Ням', eng: 'Sunday' },
];

export function WeeklySchedule() {
    const [activeDay, setActiveDay] = useState(new Date().getDay());
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        const { data, error } = await supabase
            .from('webtoon_schedules')
            .select('*, webtoons(*)');
        
        if (data) {
            setSchedules(data);
        }
        setLoading(false);
    };

    const currentDaySchedules = schedules.filter(s => s.day_of_week === activeDay);

    return (
        <div className="py-8 md:py-12 space-y-6 md:space-y-8">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                    Daily
                </h2>
                <button className="text-muted/60 text-xs font-bold hover:text-white transition-colors flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            {/* Day Selector - Simple Pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-2">
                {DAYS.map((day) => {
                    const isActive = activeDay === day.id;

                    return (
                        <button
                            key={day.id}
                            onClick={() => setActiveDay(day.id)}
                            className={`px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                isActive 
                                ? 'bg-white text-black' 
                                : 'bg-white/5 text-muted hover:bg-white/10'
                            }`}
                        >
                            {day.eng.slice(0, 3)}
                        </button>
                    );
                })}
            </div>

            {/* Content Grid */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-[3/4.5] bg-white/5 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : currentDaySchedules.length > 0 ? (
                        <motion.div 
                            key={activeDay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6"
                        >
                            {currentDaySchedules.map((s) => (
                                <WebtoonCard
                                    key={s.id}
                                    id={s.webtoons.id}
                                    title={s.webtoons.title}
                                    rating={s.webtoons.rating?.toString()}
                                    image={s.webtoons.image}
                                    chapter={s.webtoons.chapter_count_label}
                                    isNew={s.webtoons.is_new}
                                    isUpdated={false}
                                    aspect="portrait"
                                    genres={s.webtoons.genres}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-3xl border border-white/5">
                            <MonitorPlay className="w-12 h-12 text-muted/20 mb-4" />
                            <h3 className="text-lg font-bold text-white/40 uppercase tracking-widest">
                                Өнөөдөр амрана
                            </h3>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
