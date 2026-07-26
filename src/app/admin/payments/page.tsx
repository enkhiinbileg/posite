"use client";

import { useState, useEffect } from "react";
import { getPendingPaymentsAction, approvePaymentAction, deleteVideoAction } from "@/app/actions/video-actions";
import { 
    Check, X, Loader2, CreditCard, User, Film, 
    Calendar, DollarSign, Clock, Search
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    async function fetchPayments() {
        setLoading(true);
        const res = await getPendingPaymentsAction();
        if (res.success) setPayments(res.data || []);
        setLoading(false);
    }

    const handleApprove = async (id: string) => {
        if (!confirm("Та энэ төлбөрийг баталгаажуулахдаа итгэлтэй байна уу? Хэрэглэгчийн эрх шууд нээгдэнэ.")) return;
        setProcessingId(id);
        const res = await approvePaymentAction(id);
        if (res.success) {
            toast.success("Төлбөр баталгаажлаа. Хэрэглэгчийн эрх нээгдсэн.");
            fetchPayments();
        } else {
            toast.error(res.error);
        }
        setProcessingId(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Төлбөрийн <span className="text-primary">Хүсэлтүүд</span></h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Дансаар шилжүүлэг хийсэн хүмүүсийг баталгаажуулах</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input className="bg-transparent border-none outline-none text-white text-xs font-bold uppercase placeholder:text-zinc-700 w-40" placeholder="Хайх..." />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-40">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-50 grayscale gap-6 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                            <CreditCard className="w-10 h-10 text-white/20" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Хүсэлт байхгүй</h3>
                            <p className="text-xs text-muted mt-2 uppercase font-bold">Одоогоор шинэ төлбөрийн хүсэлт ирээгүй байна</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {payments.map((payment) => (
                            <div key={payment.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.07] transition-all group">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    {/* User Info */}
                                    <div className="flex items-center gap-4 w-full md:w-1/3">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                            <User className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="overflow-hidden flex flex-col">
                                            <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{payment.profiles?.full_name || 'Нэргүй хэрэглэгч'}</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase truncate">{payment.profiles?.email}</p>
                                                <span className="text-[9px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-1 rounded">UID: {payment.profiles?.unique_id || payment.profiles?.id?.slice(0, 4)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video/Payment Info */}
                                    <div className="flex items-center gap-8 w-full md:w-1/2">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Film className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Бичлэг</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase truncate max-w-[200px]">{payment.videos?.title}</span>
                                                <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">VID: {payment.videos?.id?.slice(0, 4)}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <DollarSign className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Дүн</span>
                                            </div>
                                            <span className="text-xs font-black text-emerald-500 uppercase">{payment.amount.toLocaleString()}₮</span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Төрөл</span>
                                            </div>
                                            <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md self-start">{payment.access_type === 'rental' ? 'ТҮРЭЭС' : 'БҮРЭН'}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            disabled={processingId === payment.id}
                                            onClick={() => handleApprove(payment.id)}
                                            className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            {processingId === payment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            Батлах
                                        </button>
                                        <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
