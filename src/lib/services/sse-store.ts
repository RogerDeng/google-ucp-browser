// SSE Event Store - Manages real-time event broadcasting
// This is separated from the API route to avoid SvelteKit export restrictions

// Store for SSE clients
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

// Broadcast a message to all connected clients
export function broadcastMessage(data: unknown): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const bytes = new TextEncoder().encode(message);

    clients.forEach(controller => {
        try {
            controller.enqueue(bytes);
        } catch {
            // Client disconnected, remove from set
            clients.delete(controller);
        }
    });
}

// Register a new SSE client
export function registerClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
    clients.add(controller);
}

// Unregister an SSE client
export function unregisterClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
    clients.delete(controller);
}

// Get client count (for status)
export function getClientCount(): number {
    return clients.size;
}
