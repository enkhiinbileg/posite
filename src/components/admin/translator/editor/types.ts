export interface ImageItem {
    id: string;
    preview: string;
    translatedUrl?: string;
    cleanUrl?: string;
    status: 'idle' | 'processing' | 'success' | 'error';
    file: File;
}

export interface ChapterItem {
    id: string;
    name: string;
    images: ImageItem[];
    objects?: TextObject[];
    drawings?: EraserObject[];
}

export interface TextObject {
    id: string;
    imageId: string;
    text: string;
    originalText?: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    fontWeight: string;
    fontStyle: string;
    textAlign: 'left' | 'center' | 'right';
    width: number;
    height?: number;
    rotation: number;
    backgroundColor: string;
    lineHeight: number;
    letterSpacing: number;
    opacity: number;
    isScanning?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
    glowColor?: string;
    glowBlur?: number;
    glowOpacity?: number;
    bgPaddingX?: number;
    bgPaddingY?: number;
    bgBorderRadius?: number;
    bgOpacity?: number;
    textDecoration?: 'none' | 'underline';
    gradientEnabled?: boolean;
    color2?: string;
    gradientAngle?: number;
    autoFitEnabled?: boolean;
    linkedId?: string;
}

export interface EraserObject {
    id: string;
    imageId: string;
    type?: 'solid' | 'gradient' | 'blend' | 'patch' | 'inpaint';
    points?: { x: number, y: number }[];
    pathData?: string;
    strokeWidth: number;
    color: string;
    color2?: string;
    isFill?: boolean;
    resultImage?: string;
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    sx?: number; sy?: number;
    blendSize?: number;
    blendStrength?: number;
    linkedId?: string;
}

export type ActiveTabType = 'translate' | 'style' | 'layers';
export type StyleSubTabType = 'basic' | 'stroke' | 'glow' | 'shadow' | 'fx' | 'canvas' | 'spacing' | 'opacity';
