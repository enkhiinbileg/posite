"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfYear, eachMonthOfInterval } from "date-fns";
import { mn } from "date-fns/locale";

interface ActivityCalendarProps {
    activity: { date: string; type: string }[];
}

export function DailyActivityMap({ activity }: ActivityCalendarProps) {
    const today = new Date();
    const months = eachMonthOfInterval({
        start: startOfYear(today),
        end: today
    }).reverse(); // Latest months first

    const getActivityForDay = (day: Date) => {
        return activity.find(a => isSameDay(new Date(a.date), day));
    };

    return (
        <div className="space-y-8">
            {months.map((month) => {
                const days = eachDayOfInterval({
                    start: startOfMonth(month),
                    end: endOfMonth(month)
                });

                return (
                    <div key={month.toISOString()} className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            {format(month, "MMMM yyyy", { locale: mn })}
                        </h4>

                        <div className="grid grid-cols-7 gap-1 md:gap-2">
                            {/* Weekday headers */}
                            {["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"].map(d => (
                                <div key={d} className="text-[8px] md:text-[10px] font-bold text-muted/40 text-center uppercase py-1">
                                    {d}
                                </div>
                            ))}

                            {/* Empty days for offset */}
                            {Array.from({ length: (startOfMonth(month).getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            {/* Actual days */}
                            {days.map((day) => {
                                const act = getActivityForDay(day);
                                const isToday = isSameDay(day, today);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={cn(
                                            "aspect-square rounded md:rounded-lg flex flex-col items-center justify-center relative group transition-all duration-300",
                                            act?.type === 'strike' ? "bg-primary/20 border border-primary/40 shadow-[0_0_10px_rgba(229,9,20,0.1)]" :
                                                act?.type === 'freeze' ? "bg-blue-500/20 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]" :
                                                    isToday ? "border border-white/20 bg-white/5" : "bg-white/5 border border-white/5"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[10px] md:text-xs font-bold",
                                            act ? "text-white" : isToday ? "text-primary" : "text-muted/50"
                                        )}>
                                            {format(day, "d")}
                                        </span>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-surface border border-white/10 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none whitespace-nowrap shadow-2xl">
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                {format(day, "yyyy.MM.dd")}
                                            </p>
                                            <p className={cn(
                                                "text-[9px] font-bold uppercase",
                                                act?.type === 'strike' ? "text-primary" :
                                                    act?.type === 'freeze' ? "text-blue-400" : "text-muted"
                                            )}>
                                                {act?.type === 'strike' ? "Идэвхтэй 🔥" :
                                                    act?.type === 'freeze' ? "Хөлдөөгч 🧊" : "Амарсан 💤"}
                                            </p>
                                        </div>

                                        {/* Activity Dots */}
                                        {act && (
                                            <div className={cn(
                                                "absolute bottom-1 w-1 h-1 rounded-full",
                                                act.type === 'strike' ? "bg-primary animate-pulse" : "bg-blue-400"
                                            )} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
