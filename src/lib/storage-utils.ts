interface ImageOptions {
    width?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
}

/**
 * Utility to convert direct Supabase Storage URLs to CDN-proxied URLs.
 * R2 эхлээд шалгана — R2 дээр байвал шууд R2 URL буцаана (egress үнэгүй).
 * R2 дээр байхгүй бол CDN/Supabase ашиглана.
 */
export function getCDNUrl(url: string | undefined, options?: ImageOptions): string {
    if (!url) return '';

    // If it's already a blob or local URL, return as is
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const NEXT_PUBLIC_CDN_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN;
    const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    // 1. Normalize domains - remove protocols and trailing slashes
    // Empty strings check to prevent matching everything with includes("")
    const cleanSupabaseUrl = NEXT_PUBLIC_SUPABASE_URL ? NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
    const cleanCDN = NEXT_PUBLIC_CDN_DOMAIN ? NEXT_PUBLIC_CDN_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
    const r2Base = NEXT_PUBLIC_R2_PUBLIC_URL ? NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '') : null;

    if (!cleanSupabaseUrl) return url;

    const lowerUrl = url.toLowerCase();
    const isSupabaseUrl = lowerUrl.includes(cleanSupabaseUrl.toLowerCase()) || (cleanCDN && lowerUrl.includes(cleanCDN.toLowerCase()));

    // ★ CRITICAL: R2-г ЭХЛЭЭД шалгана — R2 дээр байвал шууд буцаана
    // Supabase render/transform ашиглахгүй — R2-оос шууд татна (egress 0)
    if (r2Base && isSupabaseUrl) {
        // Handle both standard storage and SIT (Image Transformation) endpoints
        const objectMatch = url.match(/\/storage\/v1\/object\/public\/(.+)$/i);
        const renderMatch = url.match(/\/storage\/v1\/render\/image\/public\/(.+)$/i);

        const storageMatch = objectMatch || renderMatch;

        if (storageMatch && storageMatch[1]) {
            const filePath = storageMatch[1].split('?')[0]; // Strip SIT parameters
            return `${r2Base}/${filePath}`;
        }
    } else if (!r2Base && isSupabaseUrl) {
        // Warning log for developer to see why R2 is bypassed on Vercel/Local
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            console.warn('[STORAGE_OPTIMIZER] R2_PUBLIC_URL is missing. Falling back to Supabase (Egress charges apply!)');
        }
    }

    // R2-оор амжилттай солиогүй бол Supabase transformation / CDN proxying ашиглана
    let finalUrl = url;

    // Use SIT (Supabase Image Transformation) only if we're hitting Supabase domain
    if (options && (options.width || options.quality) && isSupabaseUrl) {
        // If it's already a SIT URL, keep it, otherwise convert from object to render
        if (!lowerUrl.includes('/storage/v1/render/image/public/')) {
            finalUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
        }

        const params = new URLSearchParams();
        if (options.width) params.set('width', options.width.toString());
        if (options.quality) params.set('quality', options.quality.toString());
        params.set('format', options.format || 'webp');

        finalUrl = finalUrl.includes('?') ? `${finalUrl}&${params.toString()}` : `${finalUrl}?${params.toString()}`;
    }

    // Apply CDN domain if configured and it's a Supabase-like URL
    if (cleanCDN && cleanSupabaseUrl && lowerUrl.includes(cleanSupabaseUrl.toLowerCase())) {
        return finalUrl.replace(cleanSupabaseUrl, cleanCDN).replace(/^https?:\/\/https?:\/\//, 'https://');
    }

    return finalUrl;
}

/**
 * Strips the Supabase transformation parameters to ensure we use the Cloudflare cache key effectively.
 */
export function cleanStorageUrl(url: string): string {
    try {
        const u = new URL(url);
        u.search = '';
        return u.toString();
    } catch {
        return url;
    }
}
