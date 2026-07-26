import React from 'react';
import { cn } from '../../../../lib/utils';
import { Type, Eye, EyeOff, Lock as LockIcon, Unlock as UnlockIcon, Eraser, ScanLine, Sparkles, Maximize2, Trash2, FileImage } from 'lucide-react';
import { TextObject, EraserObject, ImageItem, ActiveTabType } from './types';

interface LayerPanelProps {
    activeTab: ActiveTabType;
    objects: TextObject[];
    layerSettings: {
        text: { visible: boolean; locked: boolean };
        drawings: { visible: boolean; locked: boolean };
        original: { visible: boolean; locked: boolean };
    };
    setLayerSettings: React.Dispatch<React.SetStateAction<{
        text: { visible: boolean; locked: boolean };
        drawings: { visible: boolean; locked: boolean };
        original: { visible: boolean; locked: boolean };
    }>>;
    setSelectedId: (id: string | null) => void;
    selectedId: string | null;
    drawings: EraserObject[];
    setDrawingsMap: React.Dispatch<React.SetStateAction<Record<string, EraserObject[]>>>;
    activeChapterId: string;
    images: ImageItem[];
}

export const LayerPanel = ({
    activeTab,
    objects,
    layerSettings,
    setLayerSettings,
    setSelectedId,
    selectedId,
    drawings,
    setDrawingsMap,
    activeChapterId,
    images
}: LayerPanelProps) => {
    if (activeTab !== 'layers') return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Layers</h2>

            {/* Text Layer Control */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg"> <Type className="w-5 h-5" /> </div>
                        <div>
                            <div className="text-sm font-bold">Text Layer</div>
                            <div className="text-[10px] text-muted uppercase font-bold tracking-widest">{objects.length} items</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setLayerSettings(prev => ({ ...prev, text: { ...prev.text, visible: !prev.text.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                            {layerSettings.text.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setLayerSettings(prev => ({ ...prev, text: { ...prev.text, locked: !prev.text.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.text.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                            {layerSettings.text.locked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {/* List of objects (Mini) */}
                {layerSettings.text.visible && (
                    <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                        {objects.map((obj, i) => (
                            <div key={obj.id} onClick={() => setSelectedId(obj.id)} className={cn("p-2 rounded-lg text-xs font-bold truncate cursor-pointer", selectedId === obj.id ? "bg-primary/20 text-primary" : "text-muted hover:text-white hover:bg-white/5")}>
                                #{i + 1}: {obj.text || 'Empty'}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Drawings Layer */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-500/20 text-green-500 rounded-lg"> <Eraser className="w-5 h-5" /> </div>
                    <div>
                        <div className="text-sm font-bold">Clean / SFX</div>
                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Drawings</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setLayerSettings(prev => ({ ...prev, drawings: { ...prev.drawings, visible: !prev.drawings.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                        {layerSettings.drawings.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setLayerSettings(prev => ({ ...prev, drawings: { ...prev.drawings, locked: !prev.drawings.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.drawings.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                        {layerSettings.drawings.locked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            {layerSettings.drawings.visible && (
                <div className="pl-4 border-l-2 border-white/5 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {drawings.map((draw, i) => (
                        <div
                            key={draw.id}
                            onClick={() => setSelectedId(draw.id)}
                            className={cn(
                                "p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer group",
                                selectedId === draw.id ? "bg-primary/20 text-primary border border-primary/20" : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] opacity-50">#{i + 1}</span>
                                <span className="capitalize">{draw.type || 'Eraser'}</span>
                                {draw.type === 'patch' && <ScanLine className="w-3 h-3" />}
                                {draw.type === 'inpaint' && <Sparkles className="w-3 h-3 text-purple-400" />}
                                {draw.type === 'gradient' && <Maximize2 className="w-3 h-3" />}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDrawingsMap(prev => ({
                                        ...prev,
                                        [activeChapterId]: (prev[activeChapterId] || []).filter(d => d.id !== draw.id)
                                    }));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Original Layer */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg"> <FileImage className="w-5 h-5" /> </div>
                    <div>
                        <div className="text-sm font-bold">Original Image</div>
                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest">{images.length} pages</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setLayerSettings(prev => ({ ...prev, original: { ...prev.original, visible: !prev.original.visible } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.original.visible ? "text-white hover:bg-white/10" : "text-muted hover:text-white")}>
                        {layerSettings.original.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setLayerSettings(prev => ({ ...prev, original: { ...prev.original, locked: !prev.original.locked } }))} className={cn("p-2 rounded-lg transition-colors", layerSettings.original.locked ? "text-primary bg-primary/10" : "text-muted hover:text-white")}>
                        {layerSettings.original.locked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
