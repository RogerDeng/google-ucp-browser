// Tunnel Configuration and Status Store
import { writable, derived } from 'svelte/store';
import type { TunnelConfig, TunnelStatus } from '$lib/types/ucp';

// ============================================================================
// Persistent Storage Helpers
// ============================================================================

const STORAGE_KEY = 'ucp-browser-tunnel-config';

function loadConfig(): TunnelConfig {
    if (typeof window === 'undefined') {
        return { authtoken: '', port: 8000 };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load tunnel config:', e);
    }

    return { authtoken: '', port: 8000 };
}

function saveConfig(config: TunnelConfig): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Failed to save tunnel config:', e);
    }
}

// ============================================================================
// Tunnel Config Store
// ============================================================================

function createTunnelConfigStore() {
    const { subscribe, update, set } = writable<TunnelConfig>(loadConfig());

    return {
        subscribe,

        setAuthtoken(authtoken: string): void {
            update(config => {
                const newConfig = { ...config, authtoken };
                saveConfig(newConfig);
                return newConfig;
            });
        },

        setPort(port: number): void {
            update(config => {
                const newConfig = { ...config, port };
                saveConfig(newConfig);
                return newConfig;
            });
        },

        reset(): void {
            const defaultConfig = { authtoken: '', port: 8000 };
            set(defaultConfig);
            saveConfig(defaultConfig);
        },
    };
}

export const tunnelConfig = createTunnelConfigStore();

// ============================================================================
// Tunnel Status Store
// ============================================================================

function createTunnelStatusStore() {
    const { subscribe, update, set } = writable<TunnelStatus>({
        connected: false,
    });

    return {
        subscribe,

        setConnected(publicUrl: string, localPort: number): void {
            set({
                connected: true,
                publicUrl,
                localPort,
            });
        },

        setDisconnected(): void {
            set({
                connected: false,
            });
        },

        setError(error: string): void {
            update(status => ({
                ...status,
                connected: false,
                error,
            }));
        },

        clearError(): void {
            update(status => ({
                ...status,
                error: undefined,
            }));
        },
    };
}

export const tunnelStatus = createTunnelStatusStore();

// ============================================================================
// Tunnel Operations Store (for loading states)
// ============================================================================

export const tunnelConnecting = writable(false);

// ============================================================================
// Derived Stores
// ============================================================================

// Webhook URL based on tunnel status
export const webhookUrl = derived(tunnelStatus, ($status) => {
    if (!$status.connected || !$status.publicUrl) {
        return null;
    }
    return `${$status.publicUrl}/api/webhook`;
});

// Can connect (has authtoken and port)
export const canConnect = derived(tunnelConfig, ($config) => {
    return $config.authtoken.length > 0 && $config.port > 0 && $config.port < 65536;
});
