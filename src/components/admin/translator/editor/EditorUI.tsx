import React from 'react';
import { cn } from '../../../../lib/utils';

export const NavBtn = ({ active, icon: Icon, label, onClick, danger, highlight }: any) => (
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

export const ToolBtn = ({ active, icon: Icon, label, onClick }: any) => (
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

export const ModalContainer = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};
