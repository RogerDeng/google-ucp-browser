// Tunnel Manager API - Controls ngrok process lifecycle
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { spawn, type ChildProcess } from 'child_process';

// Store for the ngrok process
let ngrokProcess: ChildProcess | null = null;
let ngrokPublicUrl: string | null = null;
let ngrokError: string | null = null;

// Connect - Start ngrok tunnel
export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const { authtoken, port } = body as { authtoken?: string; port?: number };

    if (!authtoken) {
        throw error(400, { message: 'Missing authtoken' });
    }

    if (!port || port < 1 || port > 65535) {
        throw error(400, { message: 'Invalid port number' });
    }

    // Kill existing process if any
    if (ngrokProcess) {
        ngrokProcess.kill('SIGTERM');
        ngrokProcess = null;
        ngrokPublicUrl = null;
    }

    try {
        // Set authtoken first
        await setAuthtoken(authtoken);

        // Start ngrok
        ngrokPublicUrl = null;
        ngrokError = null;

        return new Promise((resolve) => {
            ngrokProcess = spawn('ngrok', ['http', port.toString(), '--log=stdout', '--log-format=json'], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (ngrokPublicUrl) {
                        resolve(json({
                            success: true,
                            publicUrl: ngrokPublicUrl,
                            port
                        }));
                    } else {
                        resolve(json({
                            success: false,
                            error: ngrokError || 'Timeout waiting for ngrok to start'
                        }, { status: 500 }));
                    }
                }
            }, 10000);

            ngrokProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                const lines = output.split('\n').filter(Boolean);

                for (const line of lines) {
                    try {
                        const logEntry = JSON.parse(line);

                        // Look for the URL in the log
                        if (logEntry.url && logEntry.url.startsWith('https://')) {
                            ngrokPublicUrl = logEntry.url;

                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                resolve(json({
                                    success: true,
                                    publicUrl: ngrokPublicUrl,
                                    port
                                }));
                            }
                        }

                        // Check for errors
                        if (logEntry.err) {
                            ngrokError = logEntry.err;
                        }
                    } catch {
                        // Not JSON, try parsing as text
                        const urlMatch = output.match(/url=(https:\/\/[^\s]+)/);
                        if (urlMatch) {
                            ngrokPublicUrl = urlMatch[1];

                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                resolve(json({
                                    success: true,
                                    publicUrl: ngrokPublicUrl,
                                    port
                                }));
                            }
                        }
                    }
                }
            });

            ngrokProcess.stderr?.on('data', (data: Buffer) => {
                ngrokError = data.toString();
                console.error('[ngrok stderr]', ngrokError);
            });

            ngrokProcess.on('error', (err) => {
                ngrokError = err.message;
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(json({
                        success: false,
                        error: `Failed to start ngrok: ${err.message}`
                    }, { status: 500 }));
                }
            });

            ngrokProcess.on('exit', (code) => {
                console.log('[ngrok exit]', code);
                ngrokProcess = null;
                ngrokPublicUrl = null;
            });
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Disconnect - Kill ngrok process
export const DELETE: RequestHandler = async () => {
    if (ngrokProcess) {
        ngrokProcess.kill('SIGTERM');
        ngrokProcess = null;
        ngrokPublicUrl = null;
        ngrokError = null;
        return json({ success: true, message: 'Tunnel disconnected' });
    }

    return json({ success: true, message: 'No active tunnel' });
};

// Status - Get current tunnel status
export const GET: RequestHandler = async () => {
    return json({
        connected: ngrokProcess !== null && ngrokPublicUrl !== null,
        publicUrl: ngrokPublicUrl,
        error: ngrokError,
        pid: ngrokProcess?.pid,
    });
};

// Helper to set ngrok authtoken
async function setAuthtoken(authtoken: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const process = spawn('ngrok', ['config', 'add-authtoken', authtoken], {
            stdio: 'pipe',
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Failed to set authtoken, exit code: ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

// Cleanup on server shutdown
if (typeof process !== 'undefined') {
    const cleanup = () => {
        if (ngrokProcess) {
            console.log('[ngrok cleanup] Killing ngrok process');
            ngrokProcess.kill('SIGTERM');
            ngrokProcess = null;
        }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}
