// Server-Sent Events endpoint for real-time webhook notifications
import type { RequestHandler } from '@sveltejs/kit';
import { registerClient, unregisterClient } from '$lib/services/sse-store';

export const GET: RequestHandler = async () => {
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            registerClient(controller);

            // Send initial connection message
            const message = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
        },
        cancel(controller) {
            unregisterClient(controller);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
};
