// Webhook Receiver - Accepts incoming UCP callbacks from ngrok tunnel
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { broadcastMessage } from '$lib/services/sse-store';

export const POST: RequestHandler = async ({ params, request }) => {
    const path = params.path || '';

    try {
        // Parse the incoming payload
        const contentType = request.headers.get('content-type') || '';
        let payload: unknown;

        if (contentType.includes('application/json')) {
            payload = await request.json();
        } else {
            payload = await request.text();
        }

        // Extract UCP context information if available
        const ucpContext = extractUCPContext(payload);

        // Create webhook message
        const webhookMessage = {
            type: 'webhook',
            path,
            timestamp: new Date().toISOString(),
            headers: Object.fromEntries(request.headers.entries()),
            payload,
            context: ucpContext,
        };

        // Log for debugging
        console.log('[Webhook Received]', {
            path,
            transactionId: ucpContext?.transaction_id,
            messageId: ucpContext?.message_id,
        });

        // Broadcast to all connected SSE clients
        broadcastMessage(webhookMessage);

        // Return ACK response per UCP spec
        return json(
            {
                message: {
                    ack: {
                        status: 'ACK',
                    },
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('[Webhook Error]', err);

        // Return NACK on error
        return json(
            {
                message: {
                    ack: {
                        status: 'NACK',
                    },
                },
                error: {
                    type: 'INTERNAL-ERROR',
                    code: '500',
                    message: err instanceof Error ? err.message : 'Unknown error',
                },
            },
            { status: 500 }
        );
    }
};

// Handle GET for health check
export const GET: RequestHandler = async ({ params }) => {
    return json({
        status: 'ok',
        path: params.path,
        timestamp: new Date().toISOString(),
    });
};

// Extract UCP context from various payload formats
function extractUCPContext(payload: unknown): {
    transaction_id?: string;
    message_id?: string;
    action?: string;
} | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const obj = payload as Record<string, unknown>;

    // Try to extract from UCP/Beckn format
    if (obj.context && typeof obj.context === 'object') {
        const context = obj.context as Record<string, unknown>;
        return {
            transaction_id: context.transaction_id as string | undefined,
            message_id: context.message_id as string | undefined,
            action: context.action as string | undefined,
        };
    }

    // Try direct properties
    return {
        transaction_id: obj.transaction_id as string | undefined,
        message_id: obj.message_id as string | undefined,
        action: obj.action as string | undefined,
    };
}
