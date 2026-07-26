import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_PROXY_URL || "https://jtlwllzaxscxqtcoqpll.supabase.co";

export async function GET(req: NextRequest) {
    return handleProxy(req, "GET");
}

export async function POST(req: NextRequest) {
    return handleProxy(req, "POST");
}

export async function PUT(req: NextRequest) {
    return handleProxy(req, "PUT");
}

export async function PATCH(req: NextRequest) {
    return handleProxy(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
    return handleProxy(req, "DELETE");
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, prefer, Range, x-client-info",
            "Access-Control-Expose-Headers": "Content-Range, apikey, Content-Location, Content-Type",
        },
    });
}

async function handleProxy(req: NextRequest, method: string) {
    try {
        const pathname = req.nextUrl.pathname;
        const searchParams = req.nextUrl.search;
        // Strip out /supabase/ (this route)
        const supabasePath = pathname.replace(/^\/supabase/, '');

        const destinationUrl = `${SUPABASE_URL}${supabasePath}${searchParams}`;
        console.log("PROXYING TO:", destinationUrl);

        const headers = new Headers();
        const whitelist = ['content-type', 'prefer', 'range', 'accept', 'x-client-info', 'authorization', 'apikey'];

        req.headers.forEach((value, key) => {
            if (whitelist.includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        });

        // Only set anon key if no Authorization header was sent by client
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (anonKey) {
            headers.set("apikey", anonKey); // apikey always needed
            if (!headers.has("authorization")) {
                headers.set("Authorization", `Bearer ${anonKey}`);
            }
        }

        let body = null;
        if (method !== "GET" && method !== "HEAD") {
            body = await req.arrayBuffer();
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(destinationUrl, {
            method,
            headers,
            body,
            redirect: "follow",
            signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
