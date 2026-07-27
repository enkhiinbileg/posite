"use client";

import { useState, useEffect } from "react";
import { getVideosAction, createVideoAction, updateVideoAction, deleteVideoAction } from "@/app/actions/video-actions";
import { uploadImage } from "@/app/actions/upload-image";
import { 
    Plus, Trash2, Edit, Save, X, Loader2, Check,
    Image as ImageIcon, Film, DollarSign, Clock, Shield, Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminVideosPage() {
    const [videos, setVideos] = useState<any[]>([]);
    const [webtoons, setWebtoons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnail_url: '',
        video_url: '',
        duration: '0:00',
        price_purchase: 5000,
        price_rental: 1500,
        rental_duration_hours: 24,
        is_free: false,
        is_nsfw: false,
        webtoon_id: '',
        order_index: 0
    });

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        fetchVideos();
        fetchCategories();
    }, []);

    async function fetchVideos() {
        const res = await getVideosAction();
        if (res.success) setVideos(res.data || []);
        setLoading(false);
    }

    async function fetchCategories() {
        const { getAllCategoriesAdminAction } = await import("@/app/actions/category-actions");
        const res = await getAllCategoriesAdminAction();
        if (res.success && res.data) setCategories(res.data);
    }


    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Instant local preview and duration detection
        const objectUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, video_url: objectUrl }));

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const detectedDuration = formatDuration(video.duration);
            setFormData(prev => ({ ...prev, duration: detectedDuration }));
        };
        video.src = objectUrl;

        // 2. Upload to Cloudflare R2 CDN in background
        try {
            const { getPresignedUrl } = await import("@/lib/r2");
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
            const filePath = `videos/${fileName}`;

            const res = await getPresignedUrl(filePath, file.type || 'video/mp4');
            if (!res.success || !res.url) {
                toast.success("Бичлэг сонгогдон бэлэн боллоо!");
                return;
            }

            const xhr = new XMLHttpRequest();
            xhr.open('PUT', res.url);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 && res.publicUrl) {
                    setFormData(prev => ({ ...prev, video_url: res.publicUrl! }));
                    toast.success("Бичлэг сүлжээнд амжилттай хуулагдлаа!");
                } else {
                    toast.success("Бичлэг бэлэн боллоо!");
                }
                setUploadProgress(0);
            };

            xhr.onerror = () => {
                toast.success("Бичлэг сонгогдон бэлэн боллоо!");
                setUploadProgress(0);
            };

            xhr.send(file);
        } catch (error: any) {
            toast.success("Бичлэг сонгогдон бэлэн боллоо!");
            setUploadProgress(0);
        }
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Instant Local Preview so user sees image immediately!
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setFormData(prev => ({ ...prev, thumbnail_url: event.target!.result as string }));
                toast.success("Зураг сонгогдлоо!");
            }
        };
        reader.readAsDataURL(file);

        // 2. Upload to Cloudflare R2 CDN in background
        try {
            const { getPresignedUrl } = await import("@/lib/r2");
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
            const filePath = `thumbnails/${fileName}`;
            const contentType = file.type || 'image/jpeg';

            const res = await getPresignedUrl(filePath, contentType);
            if (res.success && res.url) {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', res.url);
                xhr.onload = () => {
                    if (xhr.status === 200 && res.publicUrl) {
                        setFormData(prev => ({ ...prev, thumbnail_url: res.publicUrl! }));
                    }
                };
                xhr.send(file);
            }
        } catch (error) {
            // Ignore R2 error, local preview data URL is already set!
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = {
            ...formData,
            webtoon_id: formData.webtoon_id || null
        };
        
        const res = editingId 
            ? await updateVideoAction(editingId, payload)
            : await createVideoAction(payload);

        if (res.success) {
            toast.success(editingId ? "Бичлэг амжилттай шинэчлэгдлээ" : "Бичлэг амжилттай нэмэгдлээ");
            setShowForm(false);
            setEditingId(null);
            setFormData({
                title: '', description: '', thumbnail_url: '', video_url: '', duration: '0:00',
                price_purchase: 5000, price_rental: 1500, rental_duration_hours: 24,
                is_free: false, is_nsfw: false, webtoon_id: '', order_index: 0
            });
            fetchVideos();
        } else {
            toast.error(res.error);
        }
        setIsSaving(false);
    };

    const handleEdit = (video: any) => {
        setEditingId(video.id);
        setFormData({
            title: video.title || '',
            description: video.description || '',
            thumbnail_url: video.thumbnail_url || '',
            video_url: video.video_url || '',
            duration: video.duration || '0:00',
            price_purchase: video.price_purchase || 5000,
            price_rental: video.price_rental || 1500,
            rental_duration_hours: video.rental_duration_hours || 24,
            is_free: video.is_free || false,
            is_nsfw: video.is_nsfw || false,
            webtoon_id: video.webtoon_id?.toString() || '',
            order_index: video.order_index || 0
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Та энэ видеог устгахдаа итгэлтэй байна уу?")) return;
        const res = await deleteVideoAction(id);
        if (res.success) {
            toast.success("Видео устгагдлаа");
            fetchVideos();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Видео <span className="text-primary">Удирдлага</span></h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Бичлэг нэмэх, засах, устгах хэсэг</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Шинэ видео
                    </button>
                </div>

                {showForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[2.5rem] p-6 md:p-8 pt-10 max-h-[90vh] overflow-y-auto no-scrollbar relative shadow-2xl">
                            <button onClick={() => {
                                setShowForm(false);
                                setEditingId(null);
                                setFormData({
                                    title: '', description: '', thumbnail_url: '', video_url: '', duration: '0:00',
                                    price_purchase: 5000, price_rental: 1500, rental_duration_hours: 24,
                                    is_free: false, is_nsfw: false, webtoon_id: '', order_index: 0
                                });
                            }} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors z-10"><X className="w-6 h-6" /></button>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mt-2 mb-8 leading-tight">
                                {editingId ? "Бичлэг засах" : "Шинэ видео нэмэх"}
                            </h2>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Гарчиг</label>
                                        <input 
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary/50 outline-none transition-all"
                                            placeholder="Видеоны гарчиг..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                                            <span>Thumbnail Зураг</span>
                                            {formData.thumbnail_url && (
                                                <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                                    <Check className="w-3 h-3 text-emerald-400" /> Зураг бэлэн
                                                </span>
                                            )}
                                        </label>
                                        <div className="flex gap-3 items-center">
                                            {formData.thumbnail_url && (
                                                <div className="w-14 h-12 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 relative bg-black shadow-md">
                                                    <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <input 
                                                value={formData.thumbnail_url}
                                                onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary/50 outline-none transition-all text-xs"
                                                placeholder="URL эсвэл файл хуулах"
                                            />
                                            <label className={cn(
                                                "cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center shrink-0",
                                                formData.thumbnail_url 
                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" 
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400"
                                            )}>
                                                <ImageIcon className="w-5 h-5" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                                            <span>Бичлэгийн URL</span>
                                            {uploadProgress > 0 ? (
                                                <span className="text-primary font-black animate-pulse flex items-center gap-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    ХУУЛЖ БАЙНА: {uploadProgress}%
                                                </span>
                                            ) : formData.video_url ? (
                                                <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                                    <Check className="w-3 h-3 text-emerald-400" /> Бичлэг бэлэн
                                                </span>
                                            ) : null}
                                        </label>
                                        <div className="flex gap-4 relative">
                                            <input 
                                                required
                                                value={formData.video_url}
                                                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary/50 outline-none transition-all text-xs"
                                                placeholder="YouTube линк эсвэл файл хуулах"
                                            />
                                            <label className={cn(
                                                "cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center relative overflow-hidden shrink-0",
                                                uploadProgress > 0 
                                                    ? "bg-primary/20 border-primary/40 pointer-events-none" 
                                                    : formData.video_url
                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400"
                                            )}>
                                                <Film className={cn("w-5 h-5", uploadProgress > 0 && "text-primary animate-bounce")} />
                                                <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                                                
                                                {/* Circular Progress Background for the icon button */}
                                                {uploadProgress > 0 && (
                                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                        <div className="absolute inset-0 border-2 border-primary border-t-transparent animate-spin" />
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                        
                                        {/* Prominent Progress Bar */}
                                        {uploadProgress > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className="h-full bg-gradient-to-right from-primary to-rose-400 transition-all duration-300 relative" 
                                                        style={{ width: `${uploadProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[shimmer_1s_linear_infinite]" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Upload in progress...</p>
                                                    <p className="text-[11px] font-black text-primary uppercase">{uploadProgress}%</p>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Категори / Ангилал</label>
                                        <select
                                            value={formData.webtoon_id}
                                            onChange={(e) => setFormData({...formData, webtoon_id: e.target.value})}
                                            className="w-full bg-[#18181b] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary/50 outline-none transition-all cursor-pointer font-bold text-sm"
                                        >
                                            <option value="" className="bg-zinc-900 text-zinc-400">Сонгох...</option>
                                            {categories.map((cat: any) => (
                                                <option key={cat.id || cat.name} value={cat.name} className="bg-zinc-900 text-white font-bold">
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Тайлбар</label>
                                    <textarea 
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary/50 outline-none transition-all h-24 resize-none"
                                        placeholder="Видеоны дэлгэрэнгүй..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Clock className="w-3 h-3"/> Дараалал (1, 2, 3...)</label>
                                        <input 
                                            type="number"
                                            value={formData.order_index || 0}
                                            onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2 flex flex-col justify-end pb-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.is_free} 
                                                onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                                                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 accent-emerald-500"
                                            />
                                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest group-hover:text-emerald-300 transition-colors">🆓 ҮНЭГҮЙ ТҮШИХ БИЧЛЭГ (Бүх хүнд нээлттэй)</span>
                                        </label>
                                        <p className="text-[10px] text-zinc-500 font-medium ml-8 mt-1">Чеклээгүй тохиолдолд зөвхөн 👑 VIP эрхтэй хэрэглэгчид үзэх боломжтой.</p>
                                    </div>
                                </div>

                                <button 
                                    disabled={isSaving}
                                    className="w-full py-5 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Бичлэгийг хадгалах
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
                    ) : videos.map((video) => (
                        <div key={video.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 group">
                            <div className="relative aspect-video rounded-2xl overflow-hidden mb-4">
                                <img src={video.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                {video.is_free ? (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-emerald-500 rounded-lg text-[9px] font-black text-white uppercase tracking-wider shadow-lg">🆓 Үнэгүй</div>
                                ) : (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-amber-500 rounded-lg text-[9px] font-black text-black uppercase tracking-wider font-mono shadow-lg">👑 VIP Бичлэг</div>
                                )}
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1 mb-2">{video.title}</h3>
                            <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold mb-6">
                                <span className="text-amber-400 font-black uppercase text-[10px] tracking-widest">{video.is_free ? "Нийтэд Нээлттэй" : "👑 VIP Зөвхөн"}</span>
                                <span className="text-right">{new Date(video.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleEdit(video)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    Засах
                                </button>
                                <button 
                                    onClick={() => handleDelete(video.id)}
                                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
