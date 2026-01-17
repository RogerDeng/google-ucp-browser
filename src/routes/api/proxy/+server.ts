// CORS Proxy - Bypasses browser CORS for outgoing UCP requests
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, request }) => {
    return handleProxy(url, request, 'GET');
};

export const POST: RequestHandler = async ({ url, request }) => {
    return handleProxy(url, request, 'POST');
};

export const PUT: RequestHandler = async ({ url, request }) => {
    return handleProxy(url, request, 'PUT');
};

export const DELETE: RequestHandler = async ({ url, request }) => {
    return handleProxy(url, request, 'DELETE');
};

export const PATCH: RequestHandler = async ({ url, request }) => {
    return handleProxy(url, request, 'PATCH');
};

async function handleProxy(
    url: URL,
    request: Request,
    method: string
): Promise<Response> {
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        throw error(400, { message: 'Missing "url" query parameter' });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        throw error(400, { message: 'Invalid target URL' });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw error(400, { message: 'Only HTTP and HTTPS protocols are allowed' });
    }

    try {
        // Prepare headers (forward relevant headers)
        const headers = new Headers();

        // Forward content-type
        const contentType = request.headers.get('content-type');
        if (contentType) {
            headers.set('Content-Type', contentType);
        }

        // Forward UCP-Agent header if present
        const ucpAgent = request.headers.get('ucp-agent');
        if (ucpAgent) {
            headers.set('UCP-Agent', ucpAgent);
        }

        // Forward Authorization header if present
        const auth = request.headers.get('authorization');
        if (auth) {
            headers.set('Authorization', auth);
        }

        // Forward X-UCP-API-Key header if present (UCP Shopping Agent uses this)
        const ucpApiKey = request.headers.get('x-ucp-api-key');
        if (ucpApiKey) {
            headers.set('X-UCP-API-Key', ucpApiKey);
        }

        // Standard headers
        headers.set('Accept', 'application/json');
        headers.set('User-Agent', 'UCP-Browser/2.0');

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        // Include body for POST/PUT
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const body = await request.text();
            if (body) {
                fetchOptions.body = body;
            }
        }

        // Make the request
        const response = await fetch(targetUrl, fetchOptions);

        // Get response body
        const responseText = await response.text();

        // Parse as JSON if possible
        let responseData: unknown;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        // Return response with CORS headers
        return json(
            {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
            },
            {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, UCP-Agent, X-UCP-API-Key',
                },
            }
        );
    } catch (err) {
        console.error('Proxy error:', err);

        const message = err instanceof Error ? err.message : 'Unknown error';

        return json(
            {
                status: 502,
                statusText: 'Bad Gateway',
                error: message,
            },
            { status: 502 }
        );
    }
}

// Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, UCP-Agent, X-UCP-API-Key',
            'Access-Control-Max-Age': '86400',
        },
    });
};
