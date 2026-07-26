"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Tag, Plus, Edit2, Trash2, Check, X,
    Crown, Zap, Star, Layout, List,
    ChevronUp, ChevronDown, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS = { Zap, Crown, Star, Layout, List };

export default function AdminPricing() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        checkPermission();
        fetchPlans();
    }, []);

    async function checkPermission() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_admin) {
                window.location.href = "/admin";
                toast.error("Танд энэ хэсэгт хандах эрх байхгүй!");
            }
        }
    }

    async function fetchPlans() {
        setLoading(true);
        const { data, error } = await supabase
            .from('pricing_plans')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!editingPlan.title || !editingPlan.price) {
            toast.error("Гарчиг болон үнэ заавал байх ёстой!");
            return;
        }

        setIsSaving(true);
        const { error } = editingPlan.id
            ? await supabase.from('pricing_plans').update(editingPlan).eq('id', editingPlan.id)
            : await supabase.from('pricing_plans').insert([editingPlan]);

        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            toast.success("Амжилттай хадгалагдлаа!");
            setEditingPlan(null);
            fetchPlans();
        }
        setIsSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Та энэ багцыг устгахдаа итгэлтэй байна уу?")) return;

        const { error } = await supabase.from('pricing_plans').delete().eq('id', id);
        if (error) {
            toast.error("Алдаа гарлаа: " + error.message);
        } else {
            toast.success("Багц устгагдлаа!");
            fetchPlans();
        }
    }

    const addNewPlan = () => {
        setEditingPlan({
            title: "",
            price: 0,
            duration_value: 1,
            duration_unit: "months",
            features: [],
            is_recommended: false,
            is_nsfw: false,
            icon_name: "Zap",
            color_preset: "from-blue-500 to-cyan-500",
            order_index: plans.length + 1
        });
    };

    if (loading) return <div className="p-8 text-white uppercase font-black">Уншиж байна...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Tag className="w-8 h-8 text-primary" />
                        Багц удирдах
                    </h1>
                    <p className="text-muted font-medium mt-1">VIP багцуудын үнэ болон боломжуудыг эндээс тохируулна</p>
                </div>
                <button
                    onClick={addNewPlan}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Шинэ багц нэмэх
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={cn(
                            "relative group bg-surface border rounded-[32px] p-6 space-y-6 transition-all",
                            plan.is_recommended ? "border-primary/50" : "border-white/5"
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br shadow-lg",
                                plan.color_preset
                            )}>
                                {(() => {
                                    const Icon = (ICONS as any)[plan.icon_name] || Zap;
                                    return <Icon className="w-6 h-6" />;
                                })()}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditingPlan(plan)} className="p-2 hover:bg-white/5 rounded-lg text-muted hover:text-white transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(plan.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-muted hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">{plan.title}</h3>
                                {plan.is_recommended && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">
                                        Recommended
                                    </span>
                                )}
                                {plan.is_nsfw && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">
                                        18+ NSFW
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-black text-white mt-1">
                                {plan.price.toLocaleString()}₮
                                <span className="text-xs text-muted font-bold ml-1">/ {plan.duration_value} {plan.duration_unit}</span>
                            </p>
                        </div>

                        <ul className="space-y-2">
                            {plan.features?.map((f: string, i: number) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-muted font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary/50" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-white/10 w-full max-w-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-8">
                        <header className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                {editingPlan.id ? 'Багц засах' : 'Шинэ багц'}
                            </h2>
                            <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6 text-muted" /></button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Гарчиг</label>
                                    <input
                                        type="text"
                                        value={editingPlan.title}
                                        onChange={e => setEditingPlan({ ...editingPlan, title: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Үнэ (₮)</label>
                                    <input
                                        type="number"
                                        value={isNaN(editingPlan.price) ? "" : editingPlan.price}
                                        onChange={e => {
                                            const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                            setEditingPlan({ ...editingPlan, price: val });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary/50 transition-all font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Утга</label>
                                        <input
                                            type="number"
                                            value={isNaN(editingPlan.duration_value) ? "" : editingPlan.duration_value}
                                            onChange={e => {
                                                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                setEditingPlan({ ...editingPlan, duration_value: val });
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Нэгж</label>
                                        <select
                                            value={editingPlan.duration_unit}
                                            onChange={e => setEditingPlan({ ...editingPlan, duration_unit: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none"
                                        >
                                            <option value="days" className="bg-surface">Days</option>
                                            <option value="months" className="bg-surface">Months</option>
                                            <option value="years" className="bg-surface">Years</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <label className="flex-1 text-sm font-bold text-white">Санал болгох (Recommended)</label>
                                    <button
                                        onClick={() => setEditingPlan({ ...editingPlan, is_recommended: !editingPlan.is_recommended })}
                                        className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all",
                                            editingPlan.is_recommended ? "bg-primary" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn("w-4 h-4 bg-white rounded-full transition-all", editingPlan.is_recommended ? "translate-x-6" : "translate-x-0")} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-red-600/5 rounded-2xl border border-red-600/10">
                                    <label className="flex-1 text-sm font-bold text-red-500">Нууц сан / +18 Багц (NSFW)</label>
                                    <button
                                        onClick={() => setEditingPlan({ ...editingPlan, is_nsfw: !editingPlan.is_nsfw })}
                                        className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all",
                                            editingPlan.is_nsfw ? "bg-red-600" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn("w-4 h-4 bg-white rounded-full transition-all", editingPlan.is_nsfw ? "translate-x-6" : "translate-x-0")} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Айкон сонгох</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {Object.entries(ICONS).map(([name, Icon]) => (
                                            <button
                                                key={name}
                                                onClick={() => setEditingPlan({ ...editingPlan, icon_name: name })}
                                                className={cn(
                                                    "p-3 rounded-xl border transition-all",
                                                    editingPlan.icon_name === name ? "bg-primary/20 border-primary" : "bg-white/5 border-transparent hover:border-white/10"
                                                )}
                                            >
                                                <Icon className="w-5 h-5 text-white" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-2">Боломжууд (Шилжүүлж бичнэ үү)</label>
                                    <div className="space-y-2">
                                        {editingPlan.features?.map((f: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={f}
                                                    onChange={e => {
                                                        const newFeatures = [...editingPlan.features];
                                                        newFeatures[i] = e.target.value;
                                                        setEditingPlan({ ...editingPlan, features: newFeatures });
                                                    }}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                                                />
                                                <button
                                                    onClick={() => setEditingPlan({ ...editingPlan, features: editingPlan.features.filter((_: any, idx: number) => idx !== i) })}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditingPlan({ ...editingPlan, features: [...(editingPlan.features || []), ""] })}
                                            className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[10px] text-muted font-black uppercase tracking-widest hover:border-white/20 transition-all"
                                        >
                                            Шинэ мөр нэмэх
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setEditingPlan(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">Цуцлах</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
