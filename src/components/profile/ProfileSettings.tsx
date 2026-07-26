"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { User, AtSign, Save, Loader2 } from "lucide-react";

interface ProfileSettingsProps {
    profile: any;
    onUpdate: () => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || "",
        username: profile?.username || ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check if username exists (if changed)
            if (formData.username !== profile.username) {
                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', formData.username)
                    .single();

                if (existingUser) {
                    throw new Error("Энэ хэрэглэгчийн нэр бүртгэлтэй байна!");
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    username: formData.username,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (error) throw error;

            toast.success("Мэдээлэл амжилттай шинэчлэгдлээ!");
            onUpdate();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-2">Хувийн мэдээлэл</h3>
                <p className="text-muted text-sm">Та өөрийн нэр болон хэрэглэгчийн нэрээ солих боломжтой.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Нэр (Full Name)</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            placeholder="Таны нэр"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Хэрэглэгчийн нэр (@username)</label>
                    <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                            placeholder="username"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-primary hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>Хадгалах</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
