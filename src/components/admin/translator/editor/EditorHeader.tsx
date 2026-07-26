import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, RotateCw, Download, CircleDashed } from 'lucide-react';

interface EditorHeaderProps {
    onClose: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onDownload: () => void;
    onSave: () => void;
    isSaving: boolean;
}

export const EditorHeader = React.memo(({
    onClose,
    undo,
    redo,
    canUndo,
    canRedo,
    onDownload,
    onSave,
    isSaving
}: EditorHeaderProps) => {
    return (
        <div className="md:hidden absolute top-0 left-0 right-0 p-4 z-50 flex items-center justify-between pointer-events-none">
            <button
                onClick={onClose}
                className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white pointer-events-auto border border-white/10 shadow-lg"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2 pointer-events-auto items-center">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 shadow-lg disabled:opacity-30"
                    title="Undo"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 shadow-lg disabled:opacity-30"
                    title="Redo"
                >
                    <RotateCw className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                <button
                    onClick={onDownload}
                    disabled={isSaving}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full font-bold text-xs uppercase shadow-lg border border-white/10 mr-1"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary/90 backdrop-blur-md text-white rounded-full font-bold text-xs uppercase shadow-lg shadow-primary/20 border border-white/10"
                >
                    {isSaving ? <CircleDashed className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
            </div>
        </div>
    );
});

EditorHeader.displayName = 'EditorHeader';
