/**
 * Utility to generate a consistent 8-digit pure numeric ID for users.
 * Example: 84920194, 10482910
 */
export function generate8DigitId(uuidString: string): string {
    if (!uuidString) return "10000000";

    // If already a numeric string of length >= 8, return first 8 digits
    if (/^\d{8,}$/.test(uuidString)) {
        return uuidString.slice(0, 8);
    }

    let hash = 0;
    for (let i = 0; i < uuidString.length; i++) {
        const char = uuidString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }

    const positiveHash = Math.abs(hash);
    const eightDigit = 10000000 + (positiveHash % 90000000);
    return eightDigit.toString();
}

export function getUser8DigitId(user: any, profile?: any): string {
    if (profile?.unique_id && /^\d{8}$/.test(profile.unique_id)) {
        return profile.unique_id;
    }
    const source = user?.id || profile?.id || "default";
    return generate8DigitId(source);
}
