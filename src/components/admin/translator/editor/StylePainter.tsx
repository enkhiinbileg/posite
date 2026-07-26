import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Paintbrush, X, Check } from 'lucide-react';
import { TextObject } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StylePainterProps {
    objects: TextObject[];
    updateObject: (id: string, updates: Partial<TextObject>) => void;
    onMount: (api: StylePainterAPI) => void;
}

export interface StylePainterAPI {
    copyStyle: (id: string) => void;
    applyStyle: (id: string) => void;
    clearClipboard: () => void;
    hasCopiedStyle: boolean;
}

const STYLE_PROPS: (keyof TextObject)[] = [
    'fontSize', 'fontFamily', 'color', 'strokeColor', 'strokeWidth', 'fontWeight',
    'fontStyle', 'textAlign', 'backgroundColor', 'lineHeight', 'letterSpacing',
    'opacity', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
    'shadowOpacity', 'glowColor', 'glowBlur', 'glowOpacity', 'bgPaddingX',
    'bgPaddingY', 'bgBorderRadius', 'bgOpacity', 'textDecoration',
    'gradientEnabled', 'color2', 'gradientAngle'
];

export const StylePainter: React.FC<StylePainterProps> = ({ objects, updateObject, onMount }) => {
    const [copiedStyle, setCopiedStyle] = useState<Partial<TextObject> | null>(null);

    const copyStyle = useCallback((id: string) => {
        const obj = objects.find(o => o.id === id);
        if (!obj) return;

        const style: Partial<TextObject> = {};
        STYLE_PROPS.forEach(key => {
            if (obj[key] !== undefined) (style as any)[key] = obj[key];
        });

        setCopiedStyle(style);
        toast.success("Загварыг хууллаа", {
            description: "Одоо өөр текст дээр наах боломжтой",
            duration: 2000
        });
    }, [objects]);

    const applyStyle = useCallback((id: string) => {
        if (!copiedStyle) return;
        updateObject(id, copiedStyle);
        toast.success("Загварыг наалаа");
    }, [copiedStyle, updateObject]);

    const clearClipboard = useCallback(() => {
        setCopiedStyle(null);
    }, []);

    useEffect(() => {
        onMount({
            copyStyle,
            applyStyle,
            clearClipboard,
            hasCopiedStyle: !!copiedStyle
        });
    }, [onMount, copyStyle, applyStyle, clearClipboard, copiedStyle]);

    return (
        <AnimatePresence>
            {copiedStyle && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="fixed bottom-24 right-8 z-[100] flex items-center gap-3 bg-surface/90 backdrop-blur-2xl border border-white/20 p-2 pr-4 rounded-2xl shadow-2xl ring-1 ring-white/10"
                >
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 relative group"
                        style={{
                            backgroundColor: copiedStyle.backgroundColor !== 'transparent' ? copiedStyle.backgroundColor : undefined,
                        }}
                    >
                        {copiedStyle.gradientEnabled ? (
                            <div
                                className="absolute inset-0 opacity-50"
                                style={{
                                    background: `linear-gradient(${copiedStyle.gradientAngle || 180}deg, ${copiedStyle.color}, ${copiedStyle.color2 || copiedStyle.color})`
                                }}
                            />
                        ) : null}

                        <span
                            className="relative z-10"
                            style={{
                                fontFamily: copiedStyle.fontFamily,
                                color: copiedStyle.color,
                                fontSize: '18px',
                                fontWeight: copiedStyle.fontWeight,
                                WebkitTextStroke: `${(copiedStyle.strokeWidth || 0) * 0.3}px ${copiedStyle.strokeColor}`,
                                paintOrder: 'stroke fill',
                                textShadow: copiedStyle.glowBlur ? `0 0 ${copiedStyle.glowBlur * 0.5}px ${copiedStyle.glowColor}` : undefined
                            }}
                        >
                            Aa
                        </span>
                    </div>

                    <div className="flex flex-col min-w-[80px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Style Copied</span>
                        <span className="text-xs text-white/90 font-bold truncate max-w-[120px]">
                            {copiedStyle.fontFamily?.split(',')[0].replace(/"/g, '') || 'Custom'}
                        </span>
                    </div>

                    <div className="h-8 w-[1px] bg-white/10 mx-1" />

                    <button
                        onClick={clearClipboard}
                        className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all active:scale-95"
                        title="Clear Clipboard"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Visual pulse indicator */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StylePainter;
