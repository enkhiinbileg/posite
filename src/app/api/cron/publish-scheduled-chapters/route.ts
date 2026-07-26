import { NextRequest, NextResponse } from "next/server";
import { publishDueScheduledChapters } from "@/lib/chapter-publishing";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
    if (process.env.NODE_ENV !== "production") return true;

    const expectedSecret = process.env.CRON_SECRET || process.env.SOCIAL_WEBHOOK_SECRET;
    if (!expectedSecret) return false;

    const headerSecret = request.headers.get("x-cron-secret");
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const querySecret = request.nextUrl.searchParams.get("secret");

    return [headerSecret, bearer, querySecret].includes(expectedSecret);
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const limit = Number(request.nextUrl.searchParams.get("limit") || 25);
        const result = await publishDueScheduledChapters(Number.isFinite(limit) ? limit : 25);
        return NextResponse.json({ ok: true, ...result, checkedAt: new Date().toISOString() });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Scheduled chapter cron failed:", error);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}
