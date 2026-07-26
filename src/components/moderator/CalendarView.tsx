'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Calendar as CalendarIcon, 
    Clock, 
    Tag, 
    Trash2,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Task {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'in_progress' | 'completed';
    color: string;
}

interface Webtoon {
    id: number;
    title: string;
}

interface Schedule {
    id: string;
    webtoon_id: number;
    day_of_week: number;
    webtoons: Webtoon;
}

export function CalendarView({ userId }: { userId: string }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'task' | 'schedule'>('task');
    const [loading, setLoading] = useState(true);

    // Form states
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [selectedWebtoonId, setSelectedWebtoonId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<number>(1);

    useEffect(() => {
        fetchData();
        fetchWebtoons();
    }, [currentDate, userId]);

    const fetchData = async () => {
        setLoading(true);
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

        const [tasksRes, schedulesRes] = await Promise.all([
            supabase
                .from('moderator_calendar_tasks')
                .select('*')
                .eq('user_id', userId)
                .gte('start_time', startOfMonth)
                .lte('start_time', endOfMonth),
            supabase
                .from('webtoon_schedules')
                .select('*, webtoons(id, title)')
                .eq('moderator_id', userId)
        ]);

        if (tasksRes.data) setTasks(tasksRes.data);
        if (schedulesRes.data) setSchedules(schedulesRes.data);
        setLoading(false);
    };

    const fetchWebtoons = async () => {
        const { data } = await supabase.from('webtoons').select('id, title').order('title');
        if (data) setWebtoons(data);
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('moderator_calendar_tasks').insert({
            user_id: userId,
            title: newTitle,
            description: newDesc,
            start_time: newStartTime,
            end_time: newEndTime || null,
            status: 'pending'
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Task added!');
            setIsModalOpen(false);
            fetchData();
            resetForm();
        }
    };

    const handleAddSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('webtoon_schedules').upsert({
            webtoon_id: parseInt(selectedWebtoonId),
            day_of_week: selectedDay,
            moderator_id: userId
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Schedule updated!');
            setIsModalOpen(false);
            fetchData();
            resetForm();
        }
    };

    const deleteTask = async (id: string) => {
        const { error } = await supabase.from('moderator_calendar_tasks').delete().eq('id', id);
        if (!error) {
            setTasks(tasks.filter(t => t.id !== id));
            toast.success('Task removed');
        }
    };

    const deleteSchedule = async (id: string) => {
        const { error } = await supabase.from('webtoon_schedules').delete().eq('id', id);
        if (!error) {
            setSchedules(schedules.filter(s => s.id !== id));
            toast.success('Schedule removed');
        }
    };

    const resetForm = () => {
        setNewTitle('');
        setNewDesc('');
        setNewStartTime('');
        setNewEndTime('');
        setSelectedWebtoonId('');
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-10 relative">
            {/* Decorative Background Elements */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                            <CalendarIcon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                                {monthName} <span className="text-primary">{currentDate.getFullYear()}</span>
                            </h2>
                            <p className="text-muted/60 text-sm font-bold uppercase tracking-[0.2em] mt-2">Moderator Planning Console</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Navigation */}
                    <div className="flex bg-[#0A0A0A] p-1.5 rounded-2xl border border-white/10 shadow-xl">
                        <button onClick={prevMonth} className="p-3 hover:bg-white/5 rounded-xl transition-all hover:scale-110 active:scale-95">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <div className="w-px h-6 bg-white/10 self-center mx-1" />
                        <button onClick={nextMonth} className="p-3 hover:bg-white/5 rounded-xl transition-all hover:scale-110 active:scale-95">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    <div className="h-10 w-px bg-white/10 hidden lg:block mx-2" />

                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setModalMode('schedule'); setIsModalOpen(true); }}
                            className="group flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all hover:border-white/20 active:scale-95"
                        >
                            <CalendarIcon className="w-4 h-4 text-primary group-hover:animate-bounce" />
                            Хуваарь
                        </button>
                        <button 
                            onClick={() => { setModalMode('task' ); setIsModalOpen(true); }}
                            className="group flex items-center gap-3 px-8 py-4 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:opacity-90 transition-all shadow-[0_15px_30px_rgba(255,59,48,0.2)] hover:shadow-[0_20px_40px_rgba(255,59,48,0.3)] active:scale-95"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                            Ажил Нэмэх
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <div className="relative bg-[#0A0A0A]/60 backdrop-blur-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="grid grid-cols-7 border-b border-white/10">
                        {['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'].map(day => (
                            <div key={day} className="py-6 text-center text-[10px] font-black text-muted/40 uppercase tracking-[0.3em]">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="grid grid-cols-7 gap-px bg-white/5">
                        {Array.from({ length: 42 }).map((_, i) => {
                            const dayNumber = i - firstDayOfMonth + 1;
                            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                            const isToday = isCurrentMonth && date.toDateString() === new Date().toDateString();
                            const dayOfWeek = date.getDay();

                            const dayTasks = tasks.filter(t => new Date(t.start_time).toDateString() === date.toDateString());
                            const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);

                            return (
                                <div 
                                    key={i} 
                                    className={`min-h-[160px] bg-[#0A0A0A]/80 p-4 transition-all duration-500 ${
                                        !isCurrentMonth ? 'opacity-10 grayscale' : 'hover:bg-white/[0.03] group/day'
                                    } ${isToday ? 'relative z-10' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-sm font-black transition-all ${
                                            isToday 
                                            ? 'bg-primary text-white w-9 h-9 flex items-center justify-center rounded-2xl shadow-[0_10px_20px_rgba(255,59,48,0.3)] rotate-3' 
                                            : 'text-muted/40 group-hover/day:text-white/60'
                                        }`}>
                                            {isCurrentMonth ? dayNumber : ''}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Schedules */}
                                        {isCurrentMonth && daySchedules.map(s => (
                                            <motion.div 
                                                layoutId={`sched-${s.id}`}
                                                key={s.id} 
                                                className="group/item relative flex items-center gap-2 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl text-[9px] font-black text-green-400 overflow-hidden"
                                            >
                                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                                <span className="truncate">{s.webtoons.title}</span>
                                                <button 
                                                    onClick={() => deleteSchedule(s.id)} 
                                                    className="absolute -right-full group-hover/item:right-0 top-0 bottom-0 px-2 bg-red-500 text-white transition-all duration-300"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </motion.div>
                                        ))}

                                        {/* Tasks */}
                                        {isCurrentMonth && dayTasks.map(t => (
                                            <motion.div 
                                                layoutId={`task-${t.id}`}
                                                key={t.id} 
                                                className="group/item relative flex flex-col p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] text-blue-300 transition-all hover:border-blue-500/40"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-black truncate uppercase leading-tight">{t.title}</span>
                                                    <button 
                                                        onClick={() => deleteTask(t.id)} 
                                                        className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {t.description && <p className="opacity-40 truncate mt-1 text-[8px] font-medium">{t.description}</p>}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
                        >
                            <h3 className="text-2xl font-black text-white uppercase italic mb-6">
                                {modalMode === 'task' ? 'Шинэ Ажил Нэмэх' : 'Вебтоон Хуваарь'}
                            </h3>

                            {modalMode === 'task' ? (
                                <form onSubmit={handleAddTask} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted uppercase tracking-widest">Гарчиг</label>
                                        <input 
                                            value={newTitle} 
                                            onChange={e => setNewTitle(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none" 
                                            placeholder="Ажлын нэр..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted uppercase tracking-widest">Тайлбар</label>
                                        <textarea 
                                            value={newDesc} 
                                            onChange={e => setNewDesc(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none h-24" 
                                            placeholder="Дэлгэрэнгүй..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted uppercase tracking-widest">Эхлэх Цаг</label>
                                            <input 
                                                type="datetime-local"
                                                value={newStartTime}
                                                onChange={e => setNewStartTime(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none" 
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted uppercase tracking-widest">Дуусах Цаг</label>
                                            <input 
                                                type="datetime-local"
                                                value={newEndTime}
                                                onChange={e => setNewEndTime(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none" 
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity mt-4">
                                        Хадгалах
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleAddSchedule} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted uppercase tracking-widest">Вебтоон Сонгох</label>
                                        <select 
                                            value={selectedWebtoonId}
                                            onChange={e => setSelectedWebtoonId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none"
                                            required
                                        >
                                            <option value="">Сонгох...</option>
                                            {webtoons.map(w => (
                                                <option key={w.id} value={w.id}>{w.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted uppercase tracking-widest">Долоо хоногийн өдөр</label>
                                        <select 
                                            value={selectedDay}
                                            onChange={e => setSelectedDay(parseInt(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:border-primary outline-none"
                                        >
                                            <option value={1}>Даваа</option>
                                            <option value={2}>Мягмар</option>
                                            <option value={3}>Лхагва</option>
                                            <option value={4}>Пүрэв</option>
                                            <option value={5}>Баасан</option>
                                            <option value={6}>Бямба</option>
                                            <option value={0}>Ням</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-colors mt-4">
                                        Хуваарийг Шинэчлэх
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
