"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Mail, Lock, Eye, EyeOff, AlertCircle, 
    CheckCircle2, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface NetflixLandingProps {
    webtoons: any[];
}

export function NetflixLanding({ webtoons }: NetflixLandingProps) {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<"signin" | "signup" | "forgot_password">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [isInstantFlipping, setIsInstantFlipping] = useState(false);

    // Auto-redirect authenticated users on landing page to /home
    useEffect(() => {
        if (user && !authLoading) {
            router.replace('/home');
        }
    }, [user, authLoading, router]);

    // Check for OAuth error in URL on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const authError = params.get("auth_error");
            if (authError) {
                setError(decodeURIComponent(authError));
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, []);

    if (user && !authLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
                    />
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin relative z-10" />
                </div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Түр хүлээнэ үү...</p>
            </div>
        );
    }

    // SAFETY FAILSAFE: If we are stuck on "Loading..." for more than 5 seconds, force it off.
    useEffect(() => {
        if (isInstantFlipping) {
            const timer = setTimeout(() => {
                console.warn("[NetflixLanding] Sticky loading detected, clearing failsafe...");
                setIsInstantFlipping(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isInstantFlipping]);

    // Handle Supabase Auth events (like clicking a recovery email)
    useEffect(() => {
        // Auth state transitions (SIGN_IN/OUT) are handled globally by AuthProvider
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === "forgot_password") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password`,
                });
                if (error) throw error;
                setIsEmailSent(true);
                setMessage("Нууц үг сэргээх холбоосыг и-мэйлээр илгээлээ.");
            } else if (mode === "signup") {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        emailRedirectTo: `${window.location.origin}/`
                    }
                });
                if (error) throw error;

                // If user already exists, Supabase returns a user but with an empty identities array
                if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
                    throw new Error("User already registered");
                }

                if (data.session) {
                    window.location.href = "/home";
                } else {
                    setIsEmailSent(true);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                window.location.href = "/home";
            }
        } catch (err: any) {
            const msg = String(err?.message || err || '').toLowerCase();
            const name = String(err?.name || '').toLowerCase();
            const isIgnorable = name === 'aborterror' || 
                                msg.includes('aborted') || 
                                msg.includes('abort') || 
                                msg.includes('load failed') ||
                                msg.includes('failed to fetch') ||
                                msg.includes('operation was aborted');
            
            // Do not show error box for aborted or navigation-cancelled requests (Safari "Load failed")
            if (isIgnorable) return;

            let errorMsg = err?.message || "Алдаа гарлаа.";
            if (msg.includes("invalid login credentials")) errorMsg = "И-мэйл эсвэл нууц үг буруу байна.";
            else if (msg.includes("user already registered")) errorMsg = "Энэ и-мэйл бүртгэлтэй байна.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] w-full bg-black flex flex-col lg:flex-row overflow-hidden font-montserrat">
            
            {/* Left Section: Hero Art Background */}
            <div className="relative flex-1 h-[60vh] lg:h-screen overflow-hidden border-r border-white/5">
                
                {/* Static Art with Subtle Scale Animation */}
                <motion.div 
                    initial={{ scale: 1.05, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 z-0"
                >
                    <img 
                        src="/landing_hero.png" 
                        alt="Hero Art" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 z-10" />
                </motion.div>

                {/* Content Layer */}
                <div className="absolute inset-0 z-20 flex flex-col h-full px-8 lg:px-20 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <img src="/logo.png" alt="MyToon" className="h-12 lg:h-16 object-contain" />
                    </motion.div>

                    <div className="flex-1 flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="max-w-2xl"
                        >
                            <h1 className="text-6xl lg:text-8xl font-[900] italic tracking-tighter leading-none mb-6 drop-shadow-2xl">
                                <span className="text-white">MY</span>
                                <span className="text-primary">TOON.</span>
                            </h1>
                            <p className="text-xl lg:text-2xl text-white/60 mb-10 font-medium">
                                Хаана ч, хэзээ ч. Дуртай вэбтүүнээ уншиж эхлээрэй.
                            </p>

                            <div className="hidden lg:flex items-center gap-2 max-w-lg">
                                <input 
                                    type="email"
                                    placeholder="И-мэйл хаягаа оруулж эхлээрэй"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 bg-black/40 backdrop-blur-xl border border-white/20 h-16 px-6 rounded-lg text-white font-medium focus:outline-none focus:border-primary transition-all text-lg"
                                />
                                <button 
                                    onClick={() => setMode("signup")}
                                    className="h-16 px-8 bg-primary hover:bg-[#ff4d4d] text-white rounded-lg font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 group"
                                >
                                    Эхлэх <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                            <p className="mt-4 text-white/40 text-sm hidden lg:block">
                                Бүртгүүлэхэд бэлэн үү? И-мэйлээ оруулаад эхлээрэй.
                            </p>
                        </motion.div>
                    </div>
                </div>
                
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
            </div>

            {/* Right Section: Seamless Auth Form */}
            <div className="relative w-full lg:w-[480px] bg-black/20 lg:bg-transparent z-30 flex flex-col items-center justify-center p-8 lg:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative"
                >

                    <AnimatePresence mode="wait">
                        {isEmailSent ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-6"
                            >
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-4 uppercase italic">И-мэйл илгээгдлээ</h2>
                                <p className="text-white/60 mb-8 italic">Бид таны {email} хаяг руу холбоос илгээлээ.</p>
                                <button 
                                    onClick={() => setIsEmailSent(false)}
                                    className="text-primary font-black uppercase tracking-widest text-sm hover:underline"
                                >
                                    Буцах
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2 className="text-4xl font-black text-white mb-8 uppercase italic tracking-tighter">
                                    {mode === "signin" ? "Нэвтрэх" : mode === "signup" ? "Бүртгүүлэх" : "Нууц үг сэргээх"}
                                </h2>

                                <form onSubmit={handleAuth} className="space-y-4">
                                    {mode === "signup" && (
                                        <div className="space-y-1">
                                            <input 
                                                required
                                                type="text"
                                                placeholder="Нэр"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-zinc-800/80 border border-white/5 h-14 px-5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all font-medium"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <input 
                                            required
                                            type="email"
                                            placeholder="И-мэйл хаяг"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-zinc-800/80 border border-white/5 h-14 px-5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all font-medium"
                                        />
                                    </div>

                                    {mode !== "forgot_password" && (
                                        <div className="relative group">
                                            <input 
                                                required
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Нууц үг"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-zinc-800/80 border border-white/5 h-14 px-5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all font-medium"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    )}

                                    {mode === "signin" && (
                                        <div className="flex justify-end pr-1">
                                            <button 
                                                type="button" 
                                                onClick={() => setMode("forgot_password")}
                                                className="text-white/40 hover:text-white text-xs font-bold transition-all"
                                            >
                                                Нууц үгээ мартсан уу?
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
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
                                        disabled={loading}
                                        type="submit"
                                        className="w-full h-14 bg-primary hover:bg-[#ff4d4d] text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg transition-all disabled:opacity-50 mt-4 active:scale-95"
                                    >
                                        {loading ? "Түр хүлээнэ үү..." : mode === "signin" ? "Нэвтрэх" : mode === "signup" ? "Бүртгүүлэх" : "Илгээх"}
                                    </button>
                                </form>

                                <div className="mt-8">
                                    <div className="relative flex items-center justify-center mb-6">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                        <span className="relative bg-[#1a1a1a] px-4 text-[10px] font-black italic text-white/20 uppercase tracking-widest">Эсвэл</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            type="button"
                                            onClick={async () => {
                                                setError(null);
                                                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mytoon.site';
                                                try {
                                                    const { error } = await supabase.auth.signInWithOAuth({
                                                        provider: 'google',
                                                        options: {
                                                            redirectTo: `${origin}/auth/callback`,
                                                            queryParams: {
                                                                prompt: 'select_account'
                                                            }
                                                        }
                                                    });
                                                    if (error) {
                                                        window.location.href = '/api/auth/google';
                                                    }
                                                } catch {
                                                    window.location.href = '/api/auth/google';
                                                }
                                            }}
                                            className="w-full h-14 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95 px-4 cursor-pointer"
                                        >
                                            <img 
                                                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                                                alt="Google Logo" 
                                                className="w-5 h-5 object-contain"
                                            />
                                            <span className="whitespace-nowrap">Google-ээр үргэлжлүүлэх</span>
                                        </button>
                                    </div>

                                    <p className="mt-10 text-center text-sm font-bold text-white/40 uppercase tracking-wide">
                                        {mode === "signin" 
                                            ? "Шинэ хэрэглэгч үү?" 
                                            : mode === "signup" 
                                                ? "Бүртгэлтэй юу?" 
                                                : "Нууц үгээ санасан уу?"}{" "}
                                        <button 
                                            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                                            className="text-white hover:text-primary transition-all ml-1 hover:underline"
                                        >
                                            {mode === "signin" ? "Бүртгүүлэх" : "Нэвтрэх"}
                                        </button>
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Footer Minimal Link */}
                <div className="mt-12">
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center">
                        © 2026 MYTOON INC. БҮХ ЭРХ ХУУЛИАР ХАМГААЛАГДСАН.
                    </p>
                </div>
            </div>
        </div>
    );
}
