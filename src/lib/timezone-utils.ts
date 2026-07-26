/**
 * Timezone utilities using native Intl.DateTimeFormat API
 * to support global scheduling aligned to specific timezones (e.g. Asia/Ulaanbaatar).
 */

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) in a specific timezone
 * to a UTC Date object.
 */
export function convertLocalToUTC(dateTimeStr: string, timeZone: string): Date {
    if (!dateTimeStr) return new Date();

    const [datePart, timePart] = dateTimeStr.split('T');
    if (!datePart || !timePart) return new Date(dateTimeStr);

    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
        return new Date(dateTimeStr);
    }

    // Start with a UTC date close to the local date
    let utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });

    const getParts = (d: Date) => {
        const parts = formatter.formatToParts(d);
        const map: Record<string, number> = {};
        parts.forEach(p => {
            if (p.type !== 'literal') map[p.type] = Number(p.value);
        });
        return map;
    };

    // Iteratively adjust UTC date to match the target local time
    for (let i = 0; i < 3; i++) {
        const parts = getParts(utcDate);
        const currentLocal = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour === 24 ? 0 : parts.hour,
            parts.minute
        );
        const targetLocal = Date.UTC(year, month - 1, day, hour, minute);
        const diff = targetLocal - currentLocal;
        if (diff === 0) break;
        utcDate = new Date(utcDate.getTime() + diff);
    }

    return utcDate;
}

/**
 * Converts a UTC Date (or ISO string) to a datetime-local input string (YYYY-MM-DDTHH:mm)
 * in the specified timezone.
 */
export function convertUTCToLocalInput(utcDateOrString: Date | string | null | undefined, timeZone: string): string {
    if (!utcDateOrString) return '';
    const date = new Date(utcDateOrString);
    if (!Number.isFinite(date.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    parts.forEach(p => {
        if (p.type !== 'literal') map[p.type] = p.value;
    });

    let hour = map.hour;
    if (hour === '24') hour = '00';

    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/**
 * Formats a date in the specified timezone and returns it in Mongolian locale (mn-MN) by default.
 */
export function formatInTimeZone(
    dateOrString: Date | string | null | undefined,
    timeZone: string,
    options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    },
    locale = 'mn-MN'
): string {
    if (!dateOrString) return '';
    const date = new Date(dateOrString);
    if (!Number.isFinite(date.getTime())) return '';

    try {
        return new Intl.DateTimeFormat(locale, {
            ...options,
            timeZone
        }).format(date);
    } catch (e) {
        // Fallback if locale or timezone is not supported
        return new Intl.DateTimeFormat('mn-MN', options).format(date);
    }
}
