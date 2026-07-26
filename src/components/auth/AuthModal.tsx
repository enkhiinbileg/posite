'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMode(initialMode);
        setError(null);
    }, [initialMode, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                });
                if (signUpError) throw signUpError;
                if (data.session) {
                    onClose();
                    window.location.reload();
                } else {
                    setError('Бүртгэл амжилттай! И-мэйл хаягаа шалгаж баталгаажуулна уу.');
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                onClose();
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message || 'Алдаа гарлаа');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Google Auth Error');
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Pure Crystal Frosted Glass Container */}
            <div 
                className="relative w-full max-w-[385px] bg-[#121018]/45 backdrop-blur-3xl border border-white/25 rounded-[2.5rem] p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-7 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Glass Refraction Specular Highlight */}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/20 via-white/[0.04] to-transparent pointer-events-none rounded-t-[2.5rem]" />

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer border border-white/20 group z-10"
                >
                    <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
                </button>

                {/* Header Title */}
                <div className="text-center pt-2 relative z-10">
                    <h2 className="text-3xl font-black italic tracking-wide text-white uppercase font-sans drop-shadow-lg">
                        {mode === 'signin' ? 'Нэвтрэх' : 'БҮРТГҮҮЛЭХ'}
                    </h2>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className={`p-3.5 rounded-2xl text-xs font-semibold backdrop-blur-md relative z-10 ${error.includes('амжилттай') ? 'bg-green-500/20 text-green-200 border border-green-400/30' : 'bg-red-500/20 text-red-200 border border-red-400/30'}`}>
                        {error}
                    </div>
                )}

                {/* Google OAuth Glass Pill Button */}
                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    className="relative z-10 w-full h-12 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold rounded-full flex items-center justify-center gap-3 backdrop-blur-2xl transition-all active:scale-[0.98] cursor-pointer group shadow-md"
                >
                    <img 
                        src="https://www.svgrepo.com/show/475656/google-color.svg" 
                        alt="Google" 
                        className="w-4 h-4 object-contain transition-transform group-hover:scale-110"
                    />
                    <span className="text-xs font-bold tracking-wide">Google-ээр үргэлжлүүлэх</span>
                </button>

                {/* Underline Glass Form */}
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-semibold text-white/85 tracking-wide block">И-мэйл хаяг</label>
                        <div className="relative flex items-center border-b border-white/40 focus-within:border-white transition-colors pb-2">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none pr-8 font-medium"
                            />
                            <Mail className="absolute right-1 w-4 h-4 text-white/75" />
                        </div>
                    </div>

                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-semibold text-white/85 tracking-wide block">Нууц үг</label>
                        <div className="relative flex items-center border-b border-white/40 focus-within:border-white transition-colors pb-2">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none pr-8 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 text-white/75 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Pill White Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-white text-black font-extrabold rounded-full hover:bg-white/95 transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide shadow-2xl shadow-white/20 cursor-pointer uppercase"
                    >
                        {loading ? 'Уншиж байна...' : mode === 'signin' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
                    </button>
                </form>

                {/* Footer Navigation */}
                <div className="text-center pt-1 relative z-10">
                    <p className="text-xs font-semibold text-white/80">
                        {mode === 'signin' ? "Бүртгэлгүй юу? " : "Бүртгэлтэй юу? "}
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin');
                                setError(null);
                            }}
                            className="text-white hover:underline font-bold ml-1"
                        >
                            {mode === 'signin' ? 'Шинээр бүртгүүлэх' : 'Нэвтрэх'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
