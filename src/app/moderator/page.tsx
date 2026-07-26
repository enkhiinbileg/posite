'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Clock, Link as LinkIcon, Plus, Shield, AlertTriangle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarView } from '@/components/moderator/CalendarView';

// --- Types ---
type WorkStatus = 'working' | 'break' | 'completed' | 'idle';

export default function ModeratorDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [status, setStatus] = useState<WorkStatus>('completed');
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const [dailyLogCount, setDailyLogCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview');

    // Idle Detection
    const lastActivity = useRef(Date.now());
    const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    const WARNING_TIMEOUT = 8 * 60 * 1000; // 8 minutes warning

    const router = useRouter();

    useEffect(() => {
        checkUser();

        // Activity Listeners
        const updateActivity = () => {
            lastActivity.current = Date.now();
            if (showIdleWarning) setShowIdleWarning(false);
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);

        // Timer for Idle Check
        const interval = setInterval(() => {
            if (status === 'working') {
                const idleTime = Date.now() - lastActivity.current;

                if (idleTime > IDLE_TIMEOUT) {
                    // Auto-pause
                    handleAutoPause();
                } else if (idleTime > WARNING_TIMEOUT) {
                    setShowIdleWarning(true);
                }
            }
        }, 10000); // Check every 10s

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            clearInterval(interval);
        };
    }, [status, showIdleWarning]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_moderator, is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_moderator && !profile?.is_admin) {
            toast.error("Танд модератор эрх байхгүй байна.");
            router.push('/');
            return;
        }

        setUser(user);
        fetchTodayAttendance(user.id);
        refreshLogsCount(user.id);
    };

    const refreshLogsCount = async (userId: string) => {
        if (!userId) return;
        const today = new Date().toISOString().split('T')[0];
        const { count, error } = await supabase
            .from('moderator_work_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', today + 'T00:00:00');

        if (!error && count !== null) {
            setDailyLogCount(count);
        }
    };

    const fetchTodayAttendance = async (userId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('moderator_attendance')
            .select('*')
            .eq('user_id', userId)
            .eq('work_date', today)
            .single();

        if (data) {
            setAttendance(data);

            // Smart Recovery: Check if session is stale
            const isStale = data.current_status === 'working' &&
                data.last_activity_at &&
                (Date.now() - new Date(data.last_activity_at).getTime() > 15 * 60 * 1000);

            if (isStale) {
                setStatus('break');
                toast.warning("Өмнөх session хаагдаагүй орхигдсон байна. Систем таныг 'Завсарлага' горимд шилжүүллээ.");

                await supabase
                    .from('moderator_attendance')
                    .update({ current_status: 'break' })
                    .eq('id', data.id);
            } else {
                setStatus(data.check_out ? 'completed' : (data.current_status || 'working'));
            }
        } else {
            setStatus('completed');
        }
        setLoading(false);
        fetchActiveTeam();
    };

    const fetchActiveTeam = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data: activeSessions } = await supabase
            .from('moderator_attendance')
            .select('user_id, current_status, check_in')
            .eq('work_date', today)
            .is('check_out', null);

        if (activeSessions && activeSessions.length > 0) {
            const userIds = activeSessions.map(s => s.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email, username, avatar_url')
                .in('id', userIds);

            if (profiles) {
                const team = activeSessions.map(session => {
                    const profile = profiles.find(p => p.id === session.user_id);
                    return {
                        ...session,
                        profiles: profile
                    };
                });
                setActiveUsers(team);
            }
        } else {
            setActiveUsers([]);
        }
    };

    const handleAutoPause = async () => {
        if (status !== 'working' || !attendance) return;
        toast.warning("Удаан хугацаанд идэвхгүй байсан тул таныг 'Завсарлага' горимд шилжүүллээ.");
        // Logic to toggle break similar to previous implementation
        const breaks = attendance.breaks || [];
        breaks.push({ start: new Date().toISOString(), end: null });

        const { data, error } = await supabase
            .from('moderator_attendance')
            .update({
                current_status: 'break',
                breaks: breaks
            })
            .eq('id', attendance.id)
            .select()
            .single();

        if (!error) {
            setAttendance(data);
            setStatus('break');
            fetchActiveTeam();
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}ц ${m}м`;
    };

    if (loading && !user) return <div className="flex items-center justify-center min-h-screen text-muted font-bold animate-pulse">Уншиж байна...</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12 pb-32">
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold text-sm tracking-wider uppercase">Moderator Smart Access</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
                        Модератор Самбар
                    </h1>
                    <p className="text-muted mt-2 text-lg">
                        {status === 'working' ? '🟢 Одоо идэвхтэй ажиллаж байна' :
                            status === 'break' ? '🟡 Завсарч байна' : '🔴 Ажиллаагүй байна'}
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-black shadow-lg' : 'text-muted hover:text-white'}`}
                    >
                        <Shield className="w-4 h-4" />
                        Тойм
                    </button>
                    <button 
                        onClick={() => setActiveTab('calendar')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-white text-black shadow-lg' : 'text-muted hover:text-white'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        Календарь
                    </button>
                </div>

                {/* Active Team Pill */}
                {activeUsers.length > 0 && (
                    <div className="flex -space-x-3 bg-white/5 p-2 pr-4 rounded-full border border-white/5 items-center">
                        {activeUsers.slice(0, 4).map((u, i) => (
                            <div key={i} title={u.profiles?.username || u.profiles?.email} className="w-10 h-10 rounded-full bg-gray-800 border-2 border-[#0A0A0A] flex items-center justify-center overflow-hidden relative">
                                {u.profiles?.avatar_url ? (
                                    <img src={u.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-white uppercase">{(u.profiles?.username?.[0]) || (u.profiles?.email?.[0] || '?')}</span>
                                )}
                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${u.current_status === 'break' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            </div>
                        ))}
                        {activeUsers.length > 4 && (
                            <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-[#0A0A0A] flex items-center justify-center text-xs font-bold text-white">
                                +{activeUsers.length - 4}
                            </div>
                        )}
                        <span className="ml-4 text-xs font-bold text-muted uppercase tracking-wider hidden md:block">
                            Баг онлайн ({activeUsers.length})
                        </span>
                    </div>
                )}
            </div>

            {/* Idle Warning Modal */}
            <AnimatePresence>
                {showIdleWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 right-8 z-50 bg-yellow-500 text-black p-6 rounded-2xl shadow-2xl max-w-sm border-4 border-black"
                    >
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <h3 className="font-black text-xl uppercase leading-none mb-2">Анхааруулга!</h3>
                                <p className="font-medium text-sm leading-relaxed opacity-90">
                                    Та 8 минут идэвхгүй байлаа. 2 минутын дараа цаг автоматаар зогсох болно.
                                </p>
                                <button
                                    onClick={() => { lastActivity.current = Date.now(); setShowIdleWarning(false); }}
                                    className="mt-4 w-full py-2 bg-black text-white font-bold rounded-lg hover:opacity-80 transition-opacity"
                                >
                                    Би энд байна!
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                    <motion.div 
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {/* Main Action Card */}
                        <SmartAttendanceCard
                            status={status}
                            attendance={attendance}
                            formatTime={formatTime}
                        />

                        <div className="md:col-span-2 space-y-6">
                            {/* 🎯 Daily Goal Card */}
                            <ChapterGoalCard count={dailyLogCount} target={4} />

                            {/* Logs Section */}
                            <div className="relative group h-full">
                                <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative bg-[#0A0A0A] border border-white/10 p-1 rounded-3xl h-full">
                                    <WorkLogSection
                                        userId={user?.id}
                                        attendanceId={attendance?.id}
                                        onLogAdded={() => refreshLogsCount(user?.id)}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <CalendarView userId={user?.id} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Components ---

function SmartAttendanceCard({ status, attendance, formatTime }: any) {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A] border border-white/10 h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center shadow-xl">
            {/* Dynamic Background */}
            <AnimatePresence mode='wait'>
                {status === 'working' && (
                    <motion.div
                        key="bg-pulse"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-radial from-green-500 to-transparent z-0"
                        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    />
                )}
                {status === 'break' && (
                    <motion.div
                        key="bg-break"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-yellow-500/10 z-0"
                    />
                )}
            </AnimatePresence>

            {/* Main Status Card */}
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-40 h-40 bg-[#0A0A0A] border-4 border-white/5 rounded-full flex items-center justify-center shadow-2xl">
                        <Clock className="w-16 h-16 text-primary animate-pulse" />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                        {attendance?.active_seconds ? formatTime(attendance.active_seconds) : '0ц 0м'}
                    </h2>
                    <p className="text-muted font-bold uppercase tracking-widest text-xs">
                        Өнөөдөр ажилласан цаг
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-bold text-green-500 uppercase">System Active • Auto Tracking</span>
                </div>
            </div>
        </div>
    );
}

function ChapterGoalCard({ count, target }: { count: number, target: number }) {
    const progress = Math.min((count / target) * 100, 100);
    const isCompleted = count >= target;

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            {isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 animate-pulse pointer-events-none" />
            )}

            <div className="flex items-center gap-4 z-10">
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                        <circle
                            cx="40" cy="40" r="36"
                            fill="transparent"
                            stroke={isCompleted ? "#EAB308" : "#3B82F6"}
                            strokeWidth="8"
                            strokeDasharray="226.19"
                            strokeDashoffset={226.19 - (progress / 100) * 226.19}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className={`text-xl font-black ${isCompleted ? 'text-yellow-500' : 'text-white'}`}>{Math.round(progress)}%</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                        {isCompleted ? "Өдрийн зорилго биелсэн! 🎉" : "Өдрийн Зорилго"}
                    </h3>
                    <p className="text-sm text-muted">
                        Та өнөөдөр <strong className="text-white">{count}</strong> / {target} бүлэг оруулсан байна.
                    </p>
                </div>
            </div>

            <div className="z-10 text-right">
                {isCompleted ? (
                    <div className="px-4 py-2 bg-yellow-500 text-black font-black rounded-xl uppercase tracking-wider shadow-lg shadow-yellow-500/20 animate-bounce">
                        Excellent Work!
                    </div>
                ) : (
                    <div className="text-sm font-bold text-muted uppercase tracking-wider">
                        Дахиад <span className="text-primary text-lg">{target - count}</span> бүлэг дутуу
                    </div>
                )}
            </div>
        </div>
    );
}

function WorkLogSection({ userId, attendanceId, onLogAdded }: { userId: string, attendanceId?: string, onLogAdded?: () => void }) {
    const [task, setTask] = useState('');
    const [link, setLink] = useState('');
    const [logs, setLogs] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (userId) loadLogs();
    }, [userId]);

    const loadLogs = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('moderator_work_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', today + 'T00:00:00')
            .order('created_at', { ascending: false });

        if (data) setLogs(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task.trim()) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.from('moderator_work_logs').insert({
                user_id: userId,
                attendance_id: attendanceId || null,
                task_description: task,
                resource_link: link
            });

            if (error) throw error;
            toast.success('Ажил бүртгэгдлээ!');
            setTask('');
            setLink('');
            loadLogs();
            if (onLogAdded) onLogAdded();
        } catch (err: any) {
            toast.error('Алдаа: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Check className="w-6 h-6 text-green-500" />
                Хийсэн Ажлууд
            </h2>

            <form onSubmit={handleSubmit} className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">
                            Хийсэн ажил
                        </label>
                        <input
                            type="text"
                            value={task}
                            onChange={e => setTask(e.target.value)}
                            placeholder="Жишээ: Гүнж вебтоон 5-р бүлэг..."
                            className="w-full p-3 rounded-xl border border-white/10 bg-black/50 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">
                            Холбоос
                        </label>
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full p-3 rounded-xl border border-white/10 bg-black/50 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        {submitting ? 'Бүртгэж байна...' : (
                            <>
                                <Plus className="w-4 h-4" />
                                Жагсаалтад нэмэх
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Өнөөдрийн түүх</h3>
                {logs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-muted">Одоогоор бүртгэл алга.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {logs.map(log => (
                            <li key={log.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition-colors group">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-white font-medium text-lg">{log.task_description}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-xs text-muted font-mono bg-black/30 px-2 py-1 rounded">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </span>
                                            {log.resource_link && (
                                                <a href={log.resource_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                                                    <LinkIcon className="w-3 h-3" />
                                                    Холбоос
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border 
                                        ${log.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            log.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                        {log.status === 'pending' ? 'Хүлээгдэж байна' : log.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
