'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [userSession, setUserSession] = useState<any>(null); // store active session

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    setUserSession(session);
                    setCheckingSession(false);
                } else if (event === "SIGNED_OUT") {
                    setUserSession(null);
                }
            }
        );

        const initSessionCheck = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                setError(`Алдаа: ${error.message}`);
                setCheckingSession(false);
                return;
            }

            if (session) {
                setUserSession(session);
            } else {
                // If the URL has 'code=', try explicitly exchanging it!
                const searchParams = new URLSearchParams(window.location.search);
                const code = searchParams.get('code');
                
                if (code) {
                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                         if (exchangeError.message.includes("PKCE code verifier not found")) {
                             setError("Аюулгүй байдлын алдаа: Та нууц үг сэргээх холбоосыг хүсэлт явуулсан хөтөч (browser) дээрээ нээнэ үү! Өөр хөтөч эсвэл утаснаас нээх боломжгүй.");
                         } else {
                             setError(`Код солиход алдаа гарлаа: ${exchangeError.message}`);
                         }
                    } else if (exchangeData.session) {
                         setUserSession(exchangeData.session);
                    }
                } else if (!window.location.hash.includes("type=recovery")) {
                    setError("Таны нууц үг сэргээх холбоос хуучирсан байна.");
                }
            }
            
            setTimeout(() => {
                setCheckingSession(false);
            }, 1000); 
        };

        initSessionCheck();

        return () => {
             authListener.subscription.unsubscribe();
        }
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!userSession) return;

        setLoading(true);
        setError(null);

        try {
            if (password !== confirmPassword) {
                setError("Нууц үгүүд зөрүүтэй байна.");
                setLoading(false);
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setMessage("Нууц үг амжилттай шинэчлэгдлээ. Түр хүлээнэ үү...");
            setTimeout(() => {
                window.location.href = '/';
            }, 3000); 
        } catch (err: any) {
            setError(err.message === "Auth session missing!" ? "Таны сесс баталгаажсангүй. Дахин шинэ и-мэйл холбоос авна уу." : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-1 mb-6">
                        <span className="text-3xl font-black text-white italic tracking-tighter">MY</span>
                        <span className="text-3xl font-black text-primary italic tracking-tighter">TOON.</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Шинэ нууц үг</h1>
                    <p className="text-white/40 font-bold text-xs uppercase tracking-widest mt-2 px-8">
                        Таны аюулгүй байдлын үүднээс хүчтэй нууц үг сонгоно уу
                    </p>
                </div>

                {checkingSession ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-tighter">Баталгаажуулж байна...</p>
                    </div>
                ) : !userSession ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-white text-sm font-bold leading-relaxed mb-6">
                            {error || "Холбоос хүчингүй болсон байна. Та дахин хүсэлт илгээнэ үү."}
                        </p>
                        <button 
                            onClick={() => router.push("/")}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all"
                        >
                            Нүүр хуудас руу буцах
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="relative group">
                            <input 
                                required
                                type={showPassword ? "text" : "password"}
                                placeholder="Шинэ нууц үг"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 h-14 px-5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="relative group">
                            <input 
                                required
                                type={showPassword ? "text" : "password"}
                                placeholder="Нууц үг баталгаажуулах"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/5 h-14 px-5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all font-medium"
                            />
                        </div>

                        {error && !message && (
                            <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 rounded-xl flex items-center gap-3 text-green-500 text-xs font-bold">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        <button 
                            disabled={loading || !!message}
                            type="submit"
                            className="w-full h-14 bg-primary hover:bg-[#ff4d4d] text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4 active:scale-95"
                        >
                            {loading ? "Шинэчилж байна..." : "НУУЦ ҮГ СОЛИХ"}
                        </button>
                    </form>
                )}

                <div className="mt-12 text-center">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} MYTOON ENTERTAINMENT
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
