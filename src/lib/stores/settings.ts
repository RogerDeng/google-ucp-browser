// UI Settings Store with localStorage persistence
import { writable, derived } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export interface UISettings {
    theme: 'dark' | 'light';
    leftPanelWidth: number; // percentage
    showLifecycleVisualizer: boolean;
    showTransactionTree: boolean;
    jsonExpandLevel: number; // default expand depth
    serverUrl: string; // last used server URL
    apiKey: string; // API key for server authentication
}

// ============================================================================
// Persistent Storage
// ============================================================================

const STORAGE_KEY = 'ucp-browser-settings';

const defaultSettings: UISettings = {
    theme: 'dark',
    leftPanelWidth: 50,
    showLifecycleVisualizer: true,
    showTransactionTree: true,
    jsonExpandLevel: 2,
    serverUrl: '',
    apiKey: '',
};

function loadSettings(): UISettings {
    if (typeof window === 'undefined') {
        return defaultSettings;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Failed to load UI settings:', e);
    }

    return defaultSettings;
}

function saveSettings(settings: UISettings): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save UI settings:', e);
    }
}

// ============================================================================
// Settings Store
// ============================================================================

function createSettingsStore() {
    const { subscribe, update, set } = writable<UISettings>(loadSettings());

    return {
        subscribe,

        setTheme(theme: UISettings['theme']): void {
            update(settings => {
                const newSettings = { ...settings, theme };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        setLeftPanelWidth(width: number): void {
            update(settings => {
                const newSettings = { ...settings, leftPanelWidth: Math.max(20, Math.min(80, width)) };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        toggleLifecycleVisualizer(): void {
            update(settings => {
                const newSettings = { ...settings, showLifecycleVisualizer: !settings.showLifecycleVisualizer };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        toggleTransactionTree(): void {
            update(settings => {
                const newSettings = { ...settings, showTransactionTree: !settings.showTransactionTree };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        setJsonExpandLevel(level: number): void {
            update(settings => {
                const newSettings = { ...settings, jsonExpandLevel: Math.max(0, Math.min(10, level)) };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        setServerUrl(url: string): void {
            update(settings => {
                const newSettings = { ...settings, serverUrl: url };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        setApiKey(key: string): void {
            update(settings => {
                const newSettings = { ...settings, apiKey: key };
                saveSettings(newSettings);
                return newSettings;
            });
        },

        reset(): void {
            set(defaultSettings);
            saveSettings(defaultSettings);
        },
    };
}

export const settings = createSettingsStore();

// ============================================================================
// Derived Stores
// ============================================================================

export const theme = derived(settings, ($settings) => $settings.theme);
export const leftPanelWidth = derived(settings, ($settings) => $settings.leftPanelWidth);
export const showLifecycleVisualizer = derived(settings, ($settings) => $settings.showLifecycleVisualizer);
export const showTransactionTree = derived(settings, ($settings) => $settings.showTransactionTree);
