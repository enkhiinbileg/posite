'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
    AlertTriangle,
    Calendar as CalendarIcon, 
    CalendarClock,
    BookOpen, 
    CheckCircle2,
    Clock,
    Eye,
    Plus, 
    ChevronDown,
    X,
    XCircle,
    Filter,
    ListChecks,
    Loader2,
    Play,
    Save,
    Search,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';

import WebtoonSearchSelector from '@/components/admin/WebtoonSearchSelector';
import { useAuth } from '@/context/AuthContext';
import {
    cancelChapterScheduleAction,
    getChapterScheduleAction,
    publishChapterNowAction,
    updateChapterScheduleAction,
} from '@/app/actions/webtoon-actions';
import { convertLocalToUTC, convertUTCToLocalInput, formatInTimeZone } from '@/lib/timezone-utils';

const VIEW_TIMEZONES = [
    { value: 'Asia/Ulaanbaatar', label: 'Улаанбаатар цаг (UTC+8)' },
    { value: 'Asia/Seoul', label: 'Сөүл цаг (UTC+9)' },
    { value: 'America/New_York', label: 'Нью-Йорк цаг (EST/EDT)' },
    { value: 'Europe/London', label: 'Лондон цаг (GMT/BST)' },
    { value: 'local', label: 'Миний локал цаг' }
];

function weekStartForTimeZone(date: Date, timeZone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const map: Record<string, number> = {};
    parts.forEach(p => {
        if (p.type !== 'literal') map[p.type] = Number(p.value);
    });

    const targetDateStr = `${map.year}-${map.month.toString().padStart(2, '0')}-${map.day.toString().padStart(2, '0')}T00:00`;
    const localMidnightUTC = convertLocalToUTC(targetDateStr, timeZone);
    
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(localMidnightUTC);
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = dayMap[dayOfWeekStr] ?? 0;
    
    return new Date(localMidnightUTC.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
}

function sameDayInTimeZone(a: Date, b: Date, timeZone: string): boolean {
    const aStr = convertUTCToLocalInput(a, timeZone).split('T')[0];
    const bStr = convertUTCToLocalInput(b, timeZone).split('T')[0];
    return aStr === bStr;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

interface Webtoon {
    id: number;
    title: string;
    image?: string;
    is_nsfw?: boolean;
}

interface Schedule {
    id: string;
    webtoon_id: number;
    day_of_week: number;
    moderator_id: string;
    webtoons: Webtoon;
    profiles?: {
        username: string;
        avatar_url: string;
    };
}

type ScheduleStatus = "scheduled" | "due" | "published" | "draft";

type ScheduleChapter = {
    id: number;
    webtoon_id: number;
    chapter_number: number | null;
    title: string | null;
    images: string[] | null;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    created_by: string | null;
    translator_id: string | null;
    webtoons?: {
        id: number;
        title: string;
        image?: string | null;
        author?: string | null;
    } | null;
};

const queueFilters: { id: "all" | ScheduleStatus; label: string }[] = [
    { id: "all", label: "Бүгд" },
    { id: "scheduled", label: "Товлосон" },
    { id: "due", label: "Цаг болсон" },
    { id: "published", label: "Нийтэлсэн" },
    { id: "draft", label: "Ноорог" },
];

const queueDays = [
    { id: 0, name: "Ням", full: "Ням" },
    { id: 1, name: "Дав", full: "Даваа" },
    { id: 2, name: "Мяг", full: "Мягмар" },
    { id: 3, name: "Лха", full: "Лхагва" },
    { id: 4, name: "Пүр", full: "Пүрэв" },
    { id: 5, name: "Баа", full: "Баасан" },
    { id: 6, name: "Бям", full: "Бямба" },
];

const queueHours = Array.from({ length: 24 }, (_, hour) => hour);
const hourRowHeight = 72;

function toLocalInputValue(value?: string | null, timeZone = "Asia/Ulaanbaatar") {
    const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
    return convertUTCToLocalInput(date, timeZone);
}

function toScheduleStatus(chapter: ScheduleChapter, nowMs: number): ScheduleStatus {
    if (chapter.is_published) return "published";
    if (!chapter.published_at) return "draft";
    return new Date(chapter.published_at).getTime() <= nowMs ? "due" : "scheduled";
}

function formatScheduleDate(value?: string | null, timeZone = "Asia/Ulaanbaatar") {
    if (!value) return "Цаг тавиагүй";
    return formatInTimeZone(value, timeZone, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function countdown(value: string | null, nowMs: number) {
    if (!value) return "цаггүй";
    const diff = new Date(value).getTime() - nowMs;
    if (diff <= 0) return "цаг болсон";

    const minutes = Math.floor(diff / 60000);
    const dayCount = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    if (dayCount > 0) return `${dayCount}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function statusLabel(status: ScheduleStatus) {
    if (status === "scheduled") return "Товлосон";
    if (status === "due") return "Цаг болсон";
    if (status === "published") return "Нийтэлсэн";
    return "Ноорог";
}

function weekStartFor(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
}

// Keep weekStartFor for backward compatibility if needed, but we use weekStartForTimeZone
function weekStartForTimeZoneWrapper(date: Date, timeZone: string) {
    return weekStartForTimeZone(date, timeZone);
}

function addDays(date: Date, daysToAdd: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + daysToAdd);
    return next;
}

function sameLocalDay(a: Date, b: Date, timeZone = "Asia/Ulaanbaatar") {
    return sameDayInTimeZone(a, b, timeZone);
}

function formatHour(hour: number) {
    return `${hour.toString().padStart(2, "0")}:00`;
}

function formatCalendarMonth(date: Date, timeZone = "Asia/Ulaanbaatar") {
    return new Intl.DateTimeFormat("mn-MN", {
        timeZone,
        year: "numeric",
        month: "long",
    }).format(date);
}

function statusClasses(status: ScheduleStatus) {
    if (status === "published") return "border-green-500/20 bg-green-500/10 text-green-300";
    if (status === "scheduled") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    if (status === "due") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
    return "border-white/10 bg-white/5 text-muted";
}

function statusIcon(status: ScheduleStatus) {
    if (status === "published") return <CheckCircle2 className="h-4 w-4" />;
    if (status === "scheduled") return <CalendarClock className="h-4 w-4" />;
    if (status === "due") return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
}

function WeeklyScheduleManager() {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [allWebtoons, setAllWebtoons] = useState<Webtoon[]>([]);
    
    // Form states
    const [selectedWebtoonId, setSelectedWebtoonId] = useState<number | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [schedsRes, webtoonsRes] = await Promise.all([
                supabase
                    .from('webtoon_schedules')
                    .select('*, webtoons(id, title, image, is_nsfw), profiles:moderator_id(username, avatar_url)')
                    .order('day_of_week'),
                supabase
                    .from('webtoons')
                    .select('id, title, image, is_nsfw')
                    .order('title')
            ]);

            if (schedsRes.data) setSchedules(schedsRes.data);
            if (webtoonsRes.data) setAllWebtoons(webtoonsRes.data);
        } catch (error: unknown) {
            toast.error('Дата татахад алдаа гарлаа: ' + getErrorMessage(error));
        }
    };

    const handleAddSchedule = async () => {
        if (!selectedWebtoonId) {
            toast.error('Вебтоон сонгоно уу');
            return;
        }

        setIsUpdating(true);
        try {
            const { error } = await supabase.from('webtoon_schedules').upsert({
                webtoon_id: selectedWebtoonId,
                day_of_week: selectedDay,
                moderator_id: user?.id
            });

            if (error) throw error;
            toast.success('Хуваарь амжилттай хадгалагдлаа');
            fetchData();
            setSelectedWebtoonId(null);
        } catch (error: unknown) {
            toast.error('Алдаа: ' + getErrorMessage(error));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('Энэ хуваарийг устгахдаа итгэлтэй байна уу?')) return;

        try {
            const { error } = await supabase.from('webtoon_schedules').delete().eq('id', id);
            if (error) throw error;
            setSchedules(prev => prev.filter(s => s.id !== id));
            toast.success('Хуваарь устгагдлаа');
        } catch (error: unknown) {
            toast.error('Алдаа: ' + getErrorMessage(error));
        }
    };

    const [isDayOpen, setIsDayOpen] = useState(false);

    const days = [
        { id: 1, name: 'Даваа' },
        { id: 2, name: 'Мягмар' },
        { id: 3, name: 'Лхагва' },
        { id: 4, name: 'Пүрэв' },
        { id: 5, name: 'Баасан' },
        { id: 6, name: 'Бямба' },
        { id: 0, name: 'Ням' }
    ];

    const currentDayName = days.find(d => d.id === selectedDay)?.name;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                        <CalendarIcon className="w-10 h-10 text-primary" />
                        Хуваарь <span className="text-primary italic">Менежер</span>
                    </h2>
                    <p className="text-muted mt-2 font-bold uppercase tracking-widest text-[10px]">Вебтүүнүүдийн гарах хуваарийг нэг дороос удирдах</p>
                </div>
            </div>

            {/* Quick Add Section */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative group">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Plus className="w-48 h-48 text-white" />
                </div>
                
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="md:col-span-1">
                        <WebtoonSearchSelector 
                            webtoons={allWebtoons}
                            selectedId={selectedWebtoonId}
                            onSelect={setSelectedWebtoonId}
                            label="Вебтоон Сонгох"
                        />
                    </div>
                    <div className="space-y-3 relative">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Гарах Өдөр
                        </label>
                        
                        {/* Custom Day Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDayOpen(!isDayOpen)}
                                className={cn(
                                    "w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none transition-all flex items-center justify-between hover:bg-black/60",
                                    isDayOpen && "border-primary ring-4 ring-primary/10"
                                )}
                            >
                                <span className="uppercase tracking-widest text-xs">{currentDayName}</span>
                                <ChevronDown className={cn("w-4 h-4 text-muted transition-transform", isDayOpen && "rotate-180 text-primary")} />
                            </button>

                            {isDayOpen && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {days.map((day) => (
                                        <button
                                            key={day.id}
                                            onClick={() => {
                                                setSelectedDay(day.id);
                                                setIsDayOpen(false);
                                            }}
                                            className={cn(
                                                "w-full px-5 py-3 text-left text-xs font-bold uppercase tracking-widest transition-colors",
                                                selectedDay === day.id ? "text-primary bg-primary/10" : "text-muted hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {day.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={handleAddSchedule}
                        disabled={!selectedWebtoonId || isUpdating}
                        className="bg-primary text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        <Plus className="w-4 h-4" />
                        {isUpdating ? 'Түр хүлээнэ үү...' : 'Хуваарьт Нэмэх'}
                    </button>
                </div>
            </div>

            {/* Weekly Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
                {days.map(day => {
                    const dayScheds = schedules.filter(s => s.day_of_week === day.id);
                    return (
                        <div key={day.id} className="space-y-4">
                            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{day.name}</p>
                                <span className="ml-auto text-[10px] font-bold text-muted/40">{dayScheds.length}</span>
                            </div>
                            
                            <div className="space-y-3">
                                {dayScheds.map((s) => (
                                    <div key={s.id} className="group relative bg-[#0A0A0A] border border-white/5 rounded-[1.5rem] p-4 hover:bg-white/[0.04] hover:border-primary/40 transition-all shadow-xl">
                                        <div className="flex gap-4">
                                            {/* Thumbnail */}
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 shrink-0 border border-white/10 shadow-2xl">
                                                {s.webtoons?.image ? (
                                                    <Image src={s.webtoons.image} alt="" width={56} height={56} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <BookOpen className="w-5 h-5 text-muted/20" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                                                <h4 className="text-[11px] font-black text-white uppercase leading-tight line-clamp-1 group-hover:text-primary transition-colors tracking-tight">
                                                    {s.webtoons?.title}
                                                </h4>
                                                
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/15 shrink-0 shadow-inner">
                                                        {s.profiles?.avatar_url ? (
                                                            <Image src={s.profiles.avatar_url} alt="" width={24} height={24} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <User className="w-3 h-3 text-muted" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-black text-white/70 truncate uppercase tracking-widest group-hover:text-white transition-colors">
                                                        {s.profiles?.username || 'Систем'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleDeleteSchedule(s.id)}
                                            className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 shadow-xl scale-75 group-hover:scale-100 z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                
                                {dayScheds.length === 0 && (
                                    <div className="py-8 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-10">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-center">Хоосон өдөр</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ChapterQueueDashboard() {
    const [chapters, setChapters] = useState<ScheduleChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<"all" | ScheduleStatus>("all");
    const [search, setSearch] = useState("");
    const [nowMs, setNowMs] = useState(0);
    const [calendarTimeZone, setCalendarTimeZone] = useState('Asia/Ulaanbaatar');
    const [draftTimes, setDraftTimes] = useState<Record<number, string>>({});
    const [busyId, setBusyId] = useState<number | null>(null);

    const activeTimeZone = useMemo(() => {
        if (calendarTimeZone === 'local') {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return calendarTimeZone;
    }, [calendarTimeZone]);

    const [weekStart, setWeekStart] = useState(() => weekStartForTimeZone(new Date(), 'Asia/Ulaanbaatar'));
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

    // Sync weekStart Sunday midnight when timezone changes
    useEffect(() => {
        setWeekStart(current => weekStartForTimeZone(current, activeTimeZone));
    }, [activeTimeZone]);

    async function fetchQueue() {
        setLoading(true);
        const result = await getChapterScheduleAction();
        if (result.success) {
            const data = (result.data || []) as ScheduleChapter[];
            setChapters(data);
            setDraftTimes(Object.fromEntries(data.map((item) => [item.id, toLocalInputValue(item.published_at, activeTimeZone)])));
        } else {
            toast.error(result.error || "Schedule татахад алдаа гарлаа");
        }
        setLoading(false);
    }

    // Sync draft inputs when timezone changes
    useEffect(() => {
        if (chapters.length > 0) {
            setDraftTimes(Object.fromEntries(chapters.map((item) => [item.id, toLocalInputValue(item.published_at, activeTimeZone)])));
        }
    }, [activeTimeZone, chapters]);

    useEffect(() => {
        fetchQueue();
    }, []);

    useEffect(() => {
        setNowMs(Date.now());
        const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    async function saveTime(chapter: ScheduleChapter) {
        const value = draftTimes[chapter.id];
        if (!value) return toast.error("Цаг сонгоно уу");

        const scheduleDate = convertLocalToUTC(value, activeTimeZone);
        if (!Number.isFinite(scheduleDate.getTime())) return toast.error("Цаг буруу байна");
        if (scheduleDate.getTime() <= nowMs) return toast.error("Ирээдүйн цаг сонгоно уу");

        setBusyId(chapter.id);
        const result = await updateChapterScheduleAction(chapter.id, scheduleDate.toISOString());
        if (result.success) {
            toast.success("Товлосон цаг шинэчлэгдлээ");
            await fetchQueue();
        } else {
            toast.error(result.error || "Цаг хадгалахад алдаа гарлаа");
        }
        setBusyId(null);
    }

    async function cancelSchedule(chapter: ScheduleChapter) {
        if (!window.confirm("Энэ бүлгийг draft болгох уу?")) return;

        setBusyId(chapter.id);
        const result = await cancelChapterScheduleAction(chapter.id);
        if (result.success) {
            toast.success("Schedule цуцлагдлаа");
            await fetchQueue();
        } else {
            toast.error(result.error || "Schedule цуцлахад алдаа гарлаа");
        }
        setBusyId(null);
    }

    async function publishNow(chapter: ScheduleChapter) {
        if (!window.confirm("Энэ бүлгийг одоо нийтэд нээлттэй болгох уу?")) return;

        setBusyId(chapter.id);
        const result = await publishChapterNowAction(chapter.id);
        if (result.success) {
            const didPublish = "published" in result && result.published;
            toast.success(didPublish ? "Бүлэг нийтэд нээлттэй боллоо" : "Бүлэг аль хэдийн нийтлэгдсэн байна");
            await fetchQueue();
        } else {
            const message = "error" in result ? result.error : "Нийтлэхэд алдаа гарлаа";
            toast.error(message);
        }
        setBusyId(null);
    }

    const visibleChapters = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return [...chapters]
            .filter((chapter) => {
                const status = toScheduleStatus(chapter, nowMs);
                if (activeFilter !== "all" && status !== activeFilter) return false;
                if (!needle) return true;

                const title = `${chapter.title || ""} ${chapter.webtoons?.title || ""} ${chapter.chapter_number || ""}`.toLowerCase();
                return title.includes(needle);
            })
            .sort((a, b) => {
                const aStatus = toScheduleStatus(a, nowMs);
                const bStatus = toScheduleStatus(b, nowMs);
                const rank: Record<ScheduleStatus, number> = { due: 0, scheduled: 1, draft: 2, published: 3 };
                if (rank[aStatus] !== rank[bStatus]) return rank[aStatus] - rank[bStatus];
                return new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime();
            });
    }, [activeFilter, chapters, nowMs, search]);

    const weekDates = useMemo(() => {
        return queueDays.map((_, index) => addDays(weekStart, index));
    }, [weekStart]);

    const calendarChapters = useMemo(() => {
        const weekEnd = addDays(weekStart, 7).getTime();
        const startTime = weekStart.getTime();

        return visibleChapters.filter((chapter) => {
            if (!chapter.published_at) return false;
            const time = new Date(chapter.published_at).getTime();
            return time >= startTime && time < weekEnd;
        });
    }, [visibleChapters, weekStart]);

    const noTimeChapters = useMemo(() => {
        return visibleChapters.filter((chapter) => !chapter.published_at);
    }, [visibleChapters]);

    const selectedChapter = useMemo(() => {
        if (!selectedChapterId) return null;
        return chapters.find((chapter) => chapter.id === selectedChapterId) || null;
    }, [chapters, selectedChapterId]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        <ListChecks className="h-3.5 w-3.5" />
                        Бүлэг нийтлэх хуанли
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                        Бүлгийн хуваарь
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        Товлосон бүлгүүд долоо хоногийн хуанли дээр харагдана. Цаг нь болсон үед cron ажиллаад бүлгийг нийтэд нээлттэй болгоно.
                    </p>
                </div>
            </header>

            <section className="rounded-3xl border border-white/10 bg-surface p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Бүлэг нийтлэх</p>
                        <p className="mt-1 text-sm font-bold text-muted">
                            Шинэ бүлгээ эндээс оруулж нийтэлнэ эсвэл товлож хадгална. Товлосон цаг болоход сервер автоматаар нийтэлнэ.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                            href="/admin/chapters/new"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Шинэ бүлэг нийтлэх
                        </Link>
                        <Link
                            href="/admin/imagetrans"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                        >
                            <CalendarClock className="h-4 w-4" />
                            Орчуулгаас нийтлэх
                        </Link>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Webtoon, бүлэг, дугаараар хайх..."
                            className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-muted/50 focus:border-primary"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto">
                        {queueFilters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={cn(
                                    "inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition",
                                    activeFilter === filter.id
                                        ? "border-primary bg-primary text-white"
                                        : "border-white/10 bg-white/5 text-muted hover:text-white"
                                )}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-surface">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    <section className="rounded-3xl border border-white/10 bg-surface p-4">
                        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setWeekStart((current) => addDays(current, -7))}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => setWeekStart(weekStartForTimeZone(new Date(), activeTimeZone))}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                                >
                                    Өнөөдөр
                                </button>
                                <button
                                    onClick={() => setWeekStart((current) => addDays(current, 7))}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                                >
                                    ›
                                </button>
                                <div className="ml-2">
                                    <p className="text-lg font-black uppercase tracking-tight text-white">
                                        {weekDates[3] ? formatCalendarMonth(weekDates[3], calendarTimeZone) : formatCalendarMonth(weekStart, calendarTimeZone)}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                                        {VIEW_TIMEZONES.find(t => t.value === calendarTimeZone)?.label || "Улаанбаатар цаг (UTC+8)"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                                <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">{calendarChapters.length} цагтай бүлэг</span>
                                <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">{noTimeChapters.length} цаггүй</span>
                            </div>
                        </div>

                        {noTimeChapters.length > 0 && (
                            <div className="border-b border-white/10 py-4">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted">Цаг тавиагүй ноорог</p>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {noTimeChapters.map((chapter) => (
                                        <button
                                            key={chapter.id}
                                            onClick={() => setSelectedChapterId(chapter.id)}
                                            className={cn(
                                                "min-w-[220px] rounded-2xl border p-3 text-left transition",
                                                selectedChapterId === chapter.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                                            )}
                                        >
                                            <p className="truncate text-xs font-black text-white">{chapter.webtoons?.title || "Вебтоон тодорхойгүй"}</p>
                                            <p className="mt-1 truncate text-[10px] font-bold text-muted">Бүлэг {chapter.chapter_number || "?"} · {chapter.title || "Нэргүй"}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <div className="min-w-[1040px]">
                                <div className="grid border-b border-white/10" style={{ gridTemplateColumns: "72px repeat(7, minmax(132px, 1fr))" }}>
                                    <div className="border-r border-white/10 px-2 py-3 text-[10px] font-black uppercase tracking-widest text-muted">Цаг</div>
                                    {weekDates.map((date, index) => {
                                        const isToday = sameDayInTimeZone(date, new Date(), activeTimeZone);
                                        return (
                                            <div
                                                key={date.toISOString()}
                                                className={cn(
                                                    "border-r border-white/10 px-3 py-3 last:border-r-0",
                                                    isToday && "bg-primary/10"
                                                )}
                                            >
                                                <p className={cn("text-xs font-black uppercase tracking-widest", isToday ? "text-primary" : "text-muted")}>
                                                    {queueDays[index].full}
                                                </p>
                                                <p className="mt-1 text-xl font-black text-white">{date.getDate()}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="max-h-[720px] overflow-y-auto">
                                    <div className="grid" style={{ gridTemplateColumns: "72px repeat(7, minmax(132px, 1fr))" }}>
                                        {queueHours.map((hour) => (
                                            <div key={hour} className="contents">
                                                <div
                                                    className="border-r border-t border-white/10 bg-black/20 px-2 py-2 text-[10px] font-black text-muted"
                                                    style={{ minHeight: hourRowHeight }}
                                                >
                                                    {formatHour(hour)}
                                                </div>
                                                {weekDates.map((date) => {
                                                    const hourChapters = calendarChapters.filter((chapter) => {
                                                        if (!chapter.published_at) return false;
                                                        const publishDate = new Date(chapter.published_at);
                                                        const sameDay = sameDayInTimeZone(publishDate, date, activeTimeZone);
                                                        if (!sameDay) return false;
                                                        const localStr = convertUTCToLocalInput(publishDate, activeTimeZone);
                                                        const hourInTz = Number(localStr.split('T')[1].split(':')[0]);
                                                        return hourInTz === hour;
                                                    });

                                                    return (
                                                        <div
                                                            key={`${date.toISOString()}-${hour}`}
                                                            className="relative border-r border-t border-white/10 bg-black/[0.12] p-1.5 last:border-r-0"
                                                            style={{ minHeight: hourRowHeight }}
                                                        >
                                                            <div className="space-y-1.5">
                                                                {hourChapters.map((chapter) => {
                                                                    const status = toScheduleStatus(chapter, nowMs);
                                                                    const publishDate = chapter.published_at ? new Date(chapter.published_at) : null;

                                                                    return (
                                                                        <button
                                                                            key={chapter.id}
                                                                            onClick={() => setSelectedChapterId(chapter.id)}
                                                                            className={cn(
                                                                                "w-full rounded-xl border p-2 text-left shadow-lg transition hover:scale-[1.01]",
                                                                                selectedChapterId === chapter.id ? "border-primary bg-primary/20" : statusClasses(status)
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-[10px] font-black">
                                                                                    {publishDate ? formatInTimeZone(publishDate, activeTimeZone, { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
                                                                                </span>
                                                                                <span className="text-[9px] font-black uppercase">{statusLabel(status)}</span>
                                                                            </div>
                                                                            <p className="mt-1 line-clamp-1 text-[11px] font-black text-white">{chapter.webtoons?.title || "Вебтоон тодорхойгүй"}</p>
                                                                            <p className="line-clamp-1 text-[10px] font-bold text-white/70">Бүлэг {chapter.chapter_number || "?"} · {chapter.title || "Нэргүй"}</p>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {calendarChapters.length === 0 && noTimeChapters.length === 0 && (
                            <div className="border-t border-white/10 py-12 text-center">
                                <CalendarClock className="mx-auto mb-4 h-10 w-10 text-muted/40" />
                                <p className="text-sm font-bold text-muted">Энэ filter болон 7 хоногт бүлэг алга.</p>
                            </div>
                        )}
                    </section>

                    {selectedChapter && (
                        <section className="grid gap-4 rounded-3xl border border-white/10 bg-[#0a0a0a] p-4 lg:grid-cols-[1fr_280px_260px]">
                            <div className="flex min-w-0 gap-4">
                                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                                    {selectedChapter.webtoons?.image ? (
                                        <Image src={selectedChapter.webtoons.image} alt="" width={56} height={80} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted">
                                            <CalendarClock className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className={cn("mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusClasses(toScheduleStatus(selectedChapter, nowMs)))}>
                                        {statusIcon(toScheduleStatus(selectedChapter, nowMs))}
                                        {statusLabel(toScheduleStatus(selectedChapter, nowMs))}
                                    </div>
                                    <h3 className="truncate text-base font-black uppercase tracking-tight text-white">
                                        {selectedChapter.webtoons?.title || "Вебтоон тодорхойгүй"}
                                    </h3>
                                    <p className="mt-1 truncate text-sm font-bold text-muted">
                                        Бүлэг {selectedChapter.chapter_number || "?"} · {selectedChapter.title || "Нэргүй"}
                                    </p>
                                    <p className="mt-3 text-xs font-bold text-muted">{formatScheduleDate(selectedChapter.published_at, activeTimeZone)} · {countdown(selectedChapter.published_at, nowMs)}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Нийтлэх цаг</p>
                                <input
                                    type="datetime-local"
                                    value={draftTimes[selectedChapter.id] || ""}
                                    onChange={(event) => setDraftTimes((prev) => ({ ...prev, [selectedChapter.id]: event.target.value }))}
                                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none [color-scheme:dark] focus:border-primary"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => saveTime(selectedChapter)}
                                    disabled={busyId === selectedChapter.id}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {busyId === selectedChapter.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Цаг хадгалах
                                </button>
                                <button
                                    onClick={() => publishNow(selectedChapter)}
                                    disabled={busyId === selectedChapter.id || toScheduleStatus(selectedChapter, nowMs) === "published"}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-green-200 transition hover:bg-green-500/20 disabled:opacity-40"
                                >
                                    <Play className="h-4 w-4" />
                                    Одоо нийтлэх
                                </button>
                                <button
                                    onClick={() => cancelSchedule(selectedChapter)}
                                    disabled={busyId === selectedChapter.id || toScheduleStatus(selectedChapter, nowMs) === "published"}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Цуцлах
                                </button>
                                <Link
                                    href={`/admin/chapters/${selectedChapter.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                                >
                                    <Eye className="h-4 w-4" />
                                    Засах
                                </Link>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AdminSchedulePage() {
    const [activeTab, setActiveTab] = useState<"weekly" | "queue">("weekly");

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-30 -mx-2 border-b border-white/10 bg-background/90 px-2 py-3 backdrop-blur md:top-0">
                <div className="inline-grid rounded-2xl border border-white/10 bg-surface p-1 sm:grid-cols-2">
                    <button
                        onClick={() => setActiveTab("weekly")}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition",
                            activeTab === "weekly" ? "bg-primary text-white" : "text-muted hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        7 хоног
                    </button>
                    <button
                        onClick={() => setActiveTab("queue")}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition",
                            activeTab === "queue" ? "bg-primary text-white" : "text-muted hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <ListChecks className="h-4 w-4" />
                        Бүлгийн дараалал
                    </button>
                </div>
            </div>

            {activeTab === "weekly" ? <WeeklyScheduleManager /> : <ChapterQueueDashboard />}
        </div>
    );
}
