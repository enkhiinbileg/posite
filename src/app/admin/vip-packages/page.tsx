"use client";

import { useState, useEffect } from "react";
import { getPricingPlansAction, upsertPricingPlanAction, deletePricingPlanAction } from "@/app/actions/vip-actions";
import { Plus, Trash2, Edit, Save, X, Loader2, Crown, Gem, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AdminVipPackagesPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        id: '',
        title: '',
        price: 19900,
        duration_value: 1,
        duration_unit: 'months',
        features: 'Бүх VIP бичлэгүүдийг унших\nHD дүрсний чанар\nЗар сурталчилгаагүй',
        is_recommended: false,
        is_nsfw: false,
        icon_name: 'Zap',
        color_preset: 'from-pink-500 to-rose-500',
        order_index: 0
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        setLoading(true);
        const res = await getPricingPlansAction();
        if (res.success) {
            setPlans(res.data || []);
        } else {
            toast.error("VIP багцуудыг уншихад алдаа гарлаа");
        }
        setLoading(false);
    }

    const handleEdit = (plan: any) => {
        setEditingId(plan.id);
        setFormData({
            id: plan.id,
            title: plan.title || '',
            price: plan.price || 0,
            duration_value: plan.duration_value || 1,
            duration_unit: plan.duration_unit || 'months',
            features: Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || ''),
            is_recommended: !!plan.is_recommended,
            is_nsfw: !!plan.is_nsfw,
            icon_name: plan.icon_name || 'Zap',
            color_preset: plan.color_preset || 'from-pink-500 to-rose-500',
            order_index: plan.order_index || 0
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Энэ VIP багцыг устгахдаа итгэлтэй байна уу?")) return;
        const res = await deletePricingPlanAction(id);
        if (res.success) {
            toast.success("VIP багц амжилттай устлаа");
            setPlans(plans.filter(p => p.id !== id));
        } else {
            toast.error(res.error || "Устгахад алдаа гарлаа");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const featuresArray = formData.features
            .split('\n')
            .map(f => f.trim())
            .filter(Boolean);

        const payload = {
            ...formData,
            features: featuresArray
        };

        const res = await upsertPricingPlanAction(payload);
        if (res.success) {
            toast.success(editingId ? "VIP багц шинэчлэгдлээ" : "Шинэ VIP багц нэмэгдлээ");
            setShowForm(false);
            setEditingId(null);
            fetchPlans();
        } else {
            toast.error(res.error || "Хадгалахад алдаа гарлаа");
        }
        setIsSaving(false);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            id: '',
            title: '',
            price: 19900,
            duration_value: 1,
            duration_unit: 'months',
            features: 'Бүх VIP бичлэгүүдийг унших\nHD дүрсний чанар\nЗар сурталчилгаагүй',
            is_recommended: false,
            is_nsfw: false,
            icon_name: 'Zap',
            color_preset: 'from-pink-500 to-rose-500',
            order_index: 0
        });
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <Crown className="w-8 h-8 text-amber-500 fill-amber-500" /> VIP Багц ба Үнийн Тохиргоо
                    </h1>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Хэрэглэгчид харагдах VIP багцын үнэ, хугацаа болон боломжуудыг эндээс тохируулна
                    </p>
                </div>

                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer w-fit"
                >
                    <Plus className="w-4 h-4" /> Шинэ VIP Багц Үүсгэх
                </button>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#120d1c] border border-white/10 w-full max-w-lg rounded-3xl p-6 md:p-8 relative shadow-2xl">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-white">
                            {editingId ? "VIP Багц Засах" : "Шинэ VIP Багц Үүсгэх"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">Багцын Нэр</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Жишээ: 1 Сар (30 хоног)"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">Үнэ (₮ MNT)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="19900"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">Хугацаа (Утга)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="1 эсвэл 30"
                                        value={formData.duration_value}
                                        onChange={e => setFormData({ ...formData, duration_value: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">Хугацааны Нэгж</label>
                                <select
                                    value={formData.duration_unit}
                                    onChange={e => setFormData({ ...formData, duration_unit: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-red-500"
                                >
                                    <option value="months" className="bg-zinc-900">Сар (Months)</option>
                                    <option value="days" className="bg-zinc-900">Хоног (Days)</option>
                                    <option value="years" className="bg-zinc-900">Жил (Years)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-zinc-400 block mb-1">Боломжууд (Давхар мөрөөр бичнэ)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Бүх VIP бичлэгийг унших&#10;HD дүрсний чанар&#10;Зар сурталчилгаагүй"
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_recommended}
                                        onChange={e => setFormData({ ...formData, is_recommended: e.target.checked })}
                                        className="w-4 h-4 accent-red-600"
                                    />
                                    🔥 Санал болгох (Recommended)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_nsfw}
                                        onChange={e => setFormData({ ...formData, is_nsfw: e.target.checked })}
                                        className="w-4 h-4 accent-purple-600"
                                    />
                                    18+ VIP Багц
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase"
                                >
                                    Цуцлах
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Хадгалах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Plans List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                </div>
            ) : plans.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                    <Crown className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white uppercase mb-1">VIP Багц одоогоор алга</h3>
                    <p className="text-xs text-zinc-400 font-medium">Дээд талын "+ Шинэ VIP Багц Үүсгэх" товчлуур дээр дарж эхний багцыг үүсгээрэй.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className="bg-white/5 border border-white/10 rounded-3xl p-6 relative flex flex-col justify-between hover:border-red-500/40 transition-all"
                        >
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-white uppercase">{plan.title}</h3>
                                            {plan.is_recommended && (
                                                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                                                    Санал болгох
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-400 font-bold uppercase mt-1">
                                            Хугацаа: {plan.duration_value} {plan.duration_unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(plan)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(plan.id)}
                                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-3xl font-black text-amber-400 tracking-tight">
                                    {Number(plan.price).toLocaleString()}₮
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    {Array.isArray(plan.features) && plan.features.map((feat: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-300 font-semibold">
                                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                                <span>ID: {plan.id.slice(0, 8)}</span>
                                <span className={plan.is_nsfw ? "text-purple-400 font-bold" : "text-amber-400 font-bold"}>
                                    {plan.is_nsfw ? "18+ VIP" : "Стандарт VIP"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
