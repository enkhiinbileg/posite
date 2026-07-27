"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Crown, Edit2, LogOut, Camera, User, Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from '@/app/actions/upload-image';
import { toast } from "sonner";
import { getLevelData } from "@/lib/leveling";
import { cn } from "@/lib/utils";
import { getCDNUrl } from "@/lib/storage-utils";
import { getUser8DigitId } from "@/lib/user-id";

interface ProfileHeaderProps {
    user: any;
    profile: any;
    onUpdate: () => void;
    onSignOut: () => void;
}

export function ProfileHeader({ user, profile, onUpdate, onSignOut }: ProfileHeaderProps) {
    const [uploading, setUploading] = useState(false);

    const levelData = getLevelData(profile?.xp || 0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { scrollY } = useScroll();

    // Parallax effect for banner
    const y = useTransform(scrollY, [0, 300], [0, 100]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0.5]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucketPath', 'avatars');

            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error);
            }

            const publicUrl = result.url;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            toast.success("Avatar updated successfully!");
            onUpdate();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative w-full mb-8 lg:mb-16">
            {/* Parallax Banner */}
            <motion.div
                style={{ y, opacity }}
                className="absolute top-0 left-0 right-0 h-48 md:h-80 w-full overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background/60 to-background z-10" />
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
            </motion.div>

            {/* Content Container */}
            <div className="relative z-20 pt-28 md:pt-52 px-4 md:px-8 max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">

                {/* Avatar */}
                <div className="relative group shrink-0">
                    <div className="w-28 h-28 md:w-40 md:h-40 rounded-[2rem] border-4 border-background bg-surface shadow-2xl overflow-hidden relative">
                        {profile?.avatar_url ? (
                            <img src={getCDNUrl(profile.avatar_url, { width: 160, quality: 80 })} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <User className="w-10 h-10 md:w-12 md:h-12 text-muted" />
                            </div>
                        )}

                        {/* Upload Overlay */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
                        >
                            <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                    </div>
                    <input
                        type="file"
                        id="avatar"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {/* Info & XP Progress */}
                <div className="flex-1 w-full pb-2 space-y-4 md:space-y-6 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                        <div className="w-full">
                            <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-4 justify-center md:justify-start">
                                <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-white">
                                    {profile?.full_name || "Нэргүй"}
                                </h1>
                                <div className="flex flex-row items-center gap-2 flex-wrap justify-center mt-1 md:mt-0">
                                    {profile?.is_vip && (!profile.vip_expiration || new Date(profile.vip_expiration) > new Date()) && (
                                        <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                            <Crown className="w-3 h-3 fill-yellow-500/20" />
                                            VIP {profile.vip_expiration ? `(${Math.max(0, Math.ceil((new Date(profile.vip_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} хоног)` : ""}
                                        </span>
                                    )}
                                    {profile?.nsfw_vip_expiration && (new Date(profile.nsfw_vip_expiration) > new Date()) && (
                                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                                            <Crown className="w-3 h-3 fill-rose-500/20" />
                                            18+ VIP ({Math.max(0, Math.ceil((new Date(profile.nsfw_vip_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} хоног)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 justify-center md:justify-start mt-2 md:mt-3">
                                <p className="text-muted text-xs md:text-sm font-medium">@{profile?.username || "username"}</p>
                                <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg select-all cursor-copy hover:bg-amber-500/20 transition-all flex items-center gap-1 shadow-sm">
                                    ID: #{getUser8DigitId(user, profile)}
                                </span>
                            </div>
                        </div>
                    </div>


                    {/* XP Progress Bar */}
                    <div className="max-w-xs md:max-w-md mx-auto md:mx-0 w-full">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1 md:p-1.5 rounded-md md:rounded-lg bg-surface border", levelData.rank.border)}>
                                    <levelData.rank.icon className={cn("w-3 h-3 md:w-4 md:h-4", levelData.rank.textGradient.replace('bg-clip-text text-transparent', ''))} />
                                </div>
                                <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-widest", levelData.rank.textGradient)}>
                                    {levelData.rank.name}
                                </span>
                            </div>
                            <span className="text-[9px] md:text-[10px] font-black text-muted uppercase tracking-widest">
                                Lvl {levelData.level} • {levelData.currentXP} XP
                            </span>
                        </div>

                        <div className="h-2 md:h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px] md:p-0.5 relative group/progress">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${levelData.progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={cn(
                                    "h-full rounded-full transition-all duration-500 relative",
                                    levelData.rank.bgGradient,
                                    levelData.rank.glow
                                )}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-center pb-2 md:pb-4">
                    <button
                        onClick={() => window.location.href = '#settings'}
                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 active:scale-95 transition-all text-xs md:text-sm flex items-center justify-center gap-2 backdrop-blur-md"
                    >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span>Засах</span>
                    </button>
                    <button
                        onClick={onSignOut}
                        className="px-4 py-2.5 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20 active:scale-95 transition-all"
                    >
                        <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
