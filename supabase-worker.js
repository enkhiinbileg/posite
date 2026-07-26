addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event));
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, prefer, Range, x-client-info",
    "Access-Control-Expose-Headers": "Content-Range, apikey, Content-Location, Content-Type",
    "Access-Control-Max-Age": "86400",
};

async function handleRequest(event) {
    const request = event.request;

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only cache GET requests for storage/images
    const url = new URL(request.url);
    const isStorageRequest = url.pathname.includes('/storage/v1/object/') ||
        url.pathname.includes('/storage/v1/render/');
    const isGET = request.method === "GET";

    // ★ Check Cloudflare cache first (only for storage GETs)
    if (isGET && isStorageRequest) {
        const cache = caches.default;
        const cacheKey = new Request(request.url, { method: "GET" });
        const cached = await cache.match(cacheKey);
        if (cached) {
            // Cache hit — return immediately, no Supabase egress!
            return cached;
        }
    }

    // Forward to Supabase
    const supabaseHostname = "jtlwllzaxscxqtcoqpll.supabase.co";
    url.hostname = supabaseHostname;

    const cleanHeaders = new Headers();
    const allowedHeaders = [
        'accept', 'accept-language', 'content-language', 'content-type',
        'authorization', 'apikey', 'prefer', 'range', 'x-client-info'
    ];
    for (const [key, value] of request.headers.entries()) {
        if (allowedHeaders.includes(key.toLowerCase())) {
            cleanHeaders.set(key, value);
        }
    }

    const newRequest = new Request(url.toString(), {
        method: request.method,
        headers: cleanHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow",
    });

    try {
        let response = await fetch(newRequest);

        if (isGET && isStorageRequest && response.ok) {
            // ★ Cache storage images for 7 days at Cloudflare edge
            const cachedResponse = new Response(response.body, {
                status: response.status,
                headers: {
                    ...Object.fromEntries(response.headers.entries()),
                    ...corsHeaders,
                    "Cache-Control": "public, max-age=604800, s-maxage=604800", // 7 days
                    "CF-Cache-Status": "MISS",
                },
            });

            const cache = caches.default;
            const cacheKey = new Request(request.url, { method: "GET" });
            event.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
            return cachedResponse;
        }

        response = new Response(response.body, response);
        for (const [key, value] of Object.entries(corsHeaders)) {
            response.headers.set(key, value);
        }
        return response;
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
