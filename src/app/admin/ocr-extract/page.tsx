"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Loader2, Copy, Trash2, ChevronRight, LayoutGrid, Type, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExtractedPage {
    id: string;
    filename: string;
    preview: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    text: string;
    progress?: number;
    stage?: string;
}

export default function OCRExtractPage() {
    const [pages, setPages] = useState<ExtractedPage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check Server Status
    useEffect(() => {
        const checkServer = async () => {
            try {
                const res = await fetch("http://127.0.0.1:5000/", { method: "GET" });
                if (res.ok || res.status === 404) setServerStatus('online'); // 404 is fine as long as server responds
                else setServerStatus('offline');
            } catch (e) {
                setServerStatus('offline');
            }
        };
        checkServer();
        const interval = setInterval(checkServer, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const fileList = Array.from(files);
        const newPages: ExtractedPage[] = fileList
            .filter(f => f.type.startsWith('image/'))
            .map(f => ({
                id: Math.random().toString(36).substring(7),
                filename: f.name,
                preview: URL.createObjectURL(f),
                status: 'idle',
                text: ''
            }));
        setPages(prev => [...prev, ...newPages]);
    }, []);

    const removePage = (id: string) => {
        setPages(prev => {
            const item = prev.find(p => p.id === id);
            if (item) URL.revokeObjectURL(item.preview);
            return prev.filter(p => p.id !== id);
        });
    };

    const clearAll = () => {
        pages.forEach(p => URL.revokeObjectURL(p.preview));
        setPages([]);
    };

    const startOCR = async () => {
        if (pages.length === 0 || isProcessing) return;
        setIsProcessing(true);

        const wsUrl = "ws://127.0.0.1:5000/ws-ocr";

        for (let i = 0; i < pages.length; i++) {
            if (pages[i].status === 'success') continue;

            const pageId = pages[i].id;

            await new Promise<void>((resolve) => {
                const socket = new WebSocket(wsUrl);

                socket.onopen = async () => {
                    // Send image as base64
                    const response = await fetch(pages[i].preview);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = () => {
                        socket.send(JSON.stringify({
                            id: pageId,
                            image: reader.result
                        }));
                    };
                    reader.readAsDataURL(blob);
                };

                socket.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.type === 'progress') {
                        setPages(prev => prev.map(p => p.id === pageId ? {
                            ...p,
                            status: 'processing',
                            progress: data.percent,
                            stage: data.stage
                        } : p));
                    } else if (data.type === 'success') {
                        setPages(prev => prev.map(p => p.id === pageId ? {
                            ...p,
                            status: 'success',
                            text: Array.isArray(data.text) ? data.text.join('\n') : data.text,
                            progress: 100,
                            stage: 'Complete'
                        } : p));
                        socket.close();
                        resolve();
                    } else if (data.type === 'error') {
                        setPages(prev => prev.map(p => p.id === pageId ? {
                            ...p,
                            status: 'error',
                            stage: data.message
                        } : p));
                        socket.close();
                        resolve();
                    }
                };

                socket.onerror = () => {
                    setPages(prev => prev.map(p => p.id === pageId ? { ...p, status: 'error', stage: 'Connection Failed' } : p));
                    socket.close();
                    resolve();
                };
            });
        }

        setIsProcessing(false);
        toast.success("Бүх зургийг боловсруулж дууслаа!");
    };

    const copyAllText = () => {
        const fullText = pages
            .filter(p => p.text)
            .map((p, i) => `--- PAGE ${i + 1} (${p.filename}) ---\n${p.text}`)
            .join('\n\n');

        if (!fullText) return toast.error("Хуулах текст олдсонгүй");

        navigator.clipboard.writeText(fullText);
        toast.success("Бүх текстийг хууллаа! Одоо Gemini-д өгөхөд бэлэн.");
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 italic">
                            <Type className="w-8 h-8 text-primary" />
                            Comic OCR <span className="text-primary italic">Pro</span>
                        </h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-muted text-xs uppercase tracking-widest font-bold">Text Extraction System</p>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                                serverStatus === 'online' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                    serverStatus === 'offline' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                        "bg-white/5 border-white/10 text-muted animate-pulse"
                            )}>
                                {serverStatus === 'online' ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                                {serverStatus === 'online' ? "Server Online" :
                                    serverStatus === 'offline' ? "Server Offline" : "Checking..."}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {pages.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                        <button
                            onClick={copyAllText}
                            className="px-6 py-2 rounded-xl bg-primary text-black hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            Copy for Gemini
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-180px)]">
                    {/* Left: Upload and Preview */}
                    <div className="flex flex-col gap-4">
                        <div
                            className={cn(
                                "flex-1 rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-primary/50 transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer group relative overflow-auto custom-scrollbar",
                                pages.length > 0 && "justify-start p-4"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                            }}
                        >
                            {pages.length === 0 ? (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-10 h-10 text-muted group-hover:text-primary transition-colors" />
                                    </div>
                                    <h2 className="text-xl font-bold mb-2">Зургуудаа энд оруулна уу</h2>
                                    <p className="text-muted text-sm px-10">Вебтүний зургуудыг нэг дор чирээд тавихад автоматаар текст ялгана</p>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                                    {pages.map((page, idx) => (
                                        <div key={page.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 group/item">
                                            <img src={page.preview} alt={page.filename} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                                                    className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all mb-2"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <p className="text-[10px] truncate w-full px-2">{page.filename}</p>
                                            </div>
                                            {page.status === 'processing' && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                                            style={{ width: `${page.progress || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[14px] font-black text-primary italic mb-1">{page.progress || 0}%</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/70 animate-pulse text-center">{page.stage || 'Processing...'}</span>
                                                </div>
                                            )}
                                            {page.status === 'success' && (
                                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg transform scale-110 border-2 border-black">
                                                    <div className="w-2 h-3 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1 flex justify-between items-center bg-black/50 backdrop-blur-sm">
                                                <span className="text-[9px] font-black italic text-white/80">PAGE {idx + 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center hover:bg-white/5 hover:border-primary/30 transition-all gap-2 group"
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    >
                                        <Upload className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted group-hover:text-primary">Add More</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={startOCR}
                            disabled={pages.length === 0 || isProcessing || serverStatus !== 'online'}
                            className={cn(
                                "w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3",
                                isProcessing && "animate-pulse border-primary/30",
                                serverStatus !== 'online' && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Боловсруулж байна...
                                </>
                            ) : serverStatus !== 'online' ? (
                                <>
                                    <WifiOff className="w-5 h-5" />
                                    Сервер холбогдоогүй байна
                                </>
                            ) : (
                                <>
                                    <ChevronRight className="w-5 h-5" />
                                    Текст ялгаж эхлэх (AI OCR)
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right: Aggregated Output */}
                    <div className="flex flex-col rounded-3xl border border-white/10 bg-[#121212] overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between backdrop-blur-xl">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-primary" />
                                Extracted English Text
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted font-bold">
                                    {pages.filter(p => p.status === 'success').length} / {pages.length} Pages Done
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar space-y-6 bg-gradient-to-b from-transparent to-black/50">
                            {pages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                    <Type className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-medium italic">Зүүн талд зургуудаа оруулснаар<br />энд текстийн жагсаалт үүснэ</p>
                                </div>
                            ) : (
                                pages.map((page, idx) => (
                                    <div key={page.id} className={cn(
                                        "p-4 rounded-2xl border transition-all duration-300",
                                        page.status === 'success' ? "bg-white/[0.04] border-white/10 shadow-lg" :
                                            page.status === 'processing' ? "bg-primary/5 border-primary/20 animate-pulse" :
                                                "bg-white/[0.01] border-white/5"
                                    )}>
                                        <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                                            <span className={cn(
                                                "italic transition-colors",
                                                page.status === 'success' ? "text-primary" : "text-muted"
                                            )}>PAGE {idx + 1}</span>
                                            <div className="flex items-center gap-2">
                                                {page.status === 'processing' && (
                                                    <span className="text-primary animate-pulse">{page.progress}%</span>
                                                )}
                                                <span className="text-muted/50">{page.filename}</span>
                                            </div>
                                        </div>
                                        {page.status === 'processing' ? (
                                            <div className="space-y-3 py-2">
                                                <div className="flex items-center gap-3 italic text-muted text-xs">
                                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                                    {page.stage || 'AI Текстүүдийг уншиж байна...'}
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${page.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : page.text ? (
                                            <pre className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-white/90 font-mono bg-black/20 p-3 rounded-lg border border-white/5">
                                                {page.text}
                                            </pre>
                                        ) : (
                                            <div className="py-4 text-muted/30 italic text-xs flex items-center gap-2">
                                                {page.status === 'error' ? (
                                                    <span className="text-red-500/50">Error: {page.stage || "Failed to extract"}</span>
                                                ) : "Орчуулга хүлээгдэж байна..."}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                multiple
                accept="image/*"
                className="hidden"
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
