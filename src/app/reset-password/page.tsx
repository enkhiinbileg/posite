'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Нууц үг амжилттай шинэчлэгдлээ! Систем рүү шилжиж байна...' });
            setTimeout(() => {
                router.push('/videos');
            }, 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Нууц үг шинэчлэхэд алдаа гарлаа' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0510] text-white flex items-center justify-center p-4">
            <div className="relative w-full max-w-[400px] bg-[#121018]/60 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black italic tracking-wide uppercase text-white">ШИНЭ НУУЦ ҮГ ЗОХИОХ</h1>
                    <p className="text-xs text-white/70">Шинэ нууц үгээ оруулна уу</p>
                </div>

                {message && (
                    <div className={`p-3.5 rounded-2xl text-xs font-semibold backdrop-blur-md ${message.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-400/30' : 'bg-red-500/20 text-red-200 border border-red-400/30'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-semibold text-white/85 tracking-wide block">Шинэ нууц үг</label>
                        <div className="relative flex items-center border-b border-white/40 focus-within:border-white transition-colors pb-2">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="******"
                                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none pr-8 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 text-white/75 hover:text-white transition-colors cursor-pointer p-1"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4 text-red-400" /> : <Eye className="w-4 h-4 text-white/80" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-white text-black font-extrabold rounded-full hover:bg-white/95 transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide shadow-2xl cursor-pointer uppercase"
                    >
                        {loading ? 'ХАДГАЛЖ БАЙНА...' : 'НУУЦ ҮГ ХАДГАЛАХ'}
                    </button>
                </form>
            </div>
        </div>
    );
}
