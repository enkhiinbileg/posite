import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = (path || []).join('/');
    
    // Construct the target URL for Supabase
    const supabaseUrl = 'https://jtlwllzaxscxqtcoqpll.supabase.co';
    const targetUrl = `${supabaseUrl}/${pathString}${req.nextUrl.search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (['apikey', 'authorization', 'content-type', 'accept', 'x-client-info', 'prefer'].includes(k)) {
        headers.set(k, value);
      }
    });
    headers.set('origin', supabaseUrl);

    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      cache: 'no-store',
      redirect: 'manual',
    });

    const host = req.headers.get('host') || '';
    const cookieDomain = host.includes('mytoon.site') ? '.mytoon.site' : undefined;

    // Get response headers and adjust them
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Handle multiple Set-Cookie headers correctly
        const cookies = response.headers.getSetCookie();
        cookies.forEach(cookie => {
          let updatedCookie = cookie;
          if (cookieDomain) {
            if (/Domain=[^;]+/gi.test(updatedCookie)) {
              updatedCookie = updatedCookie.replace(/Domain=[^;]+/gi, `Domain=${cookieDomain}`);
            } else {
              updatedCookie += `; Domain=${cookieDomain}`;
            }
          } else {
            updatedCookie = updatedCookie.replace(/Domain=[^;]+;?\s*/gi, '');
          }
          responseHeaders.append('set-cookie', updatedCookie);
        });
      } else if (key.toLowerCase() !== 'content-encoding') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Supabase Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
