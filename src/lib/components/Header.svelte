<script lang="ts">
  import { Wifi, WifiOff, Settings, Radio, Menu, X } from 'lucide-svelte';
  import { tunnelStatus, webhookUrl } from '$lib/stores/tunnel';
  import { settings, showLifecycleVisualizer, showTransactionTree } from '$lib/stores/settings';

  interface Props {
    showTunnelPanel: boolean;
    showSettingsPanel: boolean;
    sseConnected: boolean;
  }

  let { showTunnelPanel = $bindable(), showSettingsPanel = $bindable(), sseConnected }: Props = $props();
</script>

<header class="header">
  <div class="header-left">
    <div class="logo">
      <Radio size={24} />
      <span class="logo-text">UCP Browser</span>
      <span class="version">v2.0</span>
    </div>
  </div>

  <div class="header-center">
    {#if $tunnelStatus.connected && $webhookUrl}
      <div class="webhook-url">
        <span class="label">Webhook:</span>
        <code>{$webhookUrl}</code>
      </div>
    {/if}
  </div>

  <div class="header-right">
    <!-- SSE Status -->
    <div class="status-indicator" class:connected={sseConnected} title={sseConnected ? 'SSE Connected' : 'SSE Disconnected'}>
      {#if sseConnected}
        <Wifi size={16} />
      {:else}
        <WifiOff size={16} />
      {/if}
    </div>

    <!-- Tunnel Status -->
    <button 
      class="header-btn"
      class:active={$tunnelStatus.connected}
      onclick={() => showTunnelPanel = !showTunnelPanel}
      title={$tunnelStatus.connected ? 'Tunnel Connected' : 'Configure Tunnel'}
    >
      {#if $tunnelStatus.connected}
        <Wifi size={16} />
        <span>Connected</span>
      {:else}
        <WifiOff size={16} />
        <span>Tunnel</span>
      {/if}
    </button>

    <!-- View Toggles -->
    <button 
      class="header-btn"
      class:active={$showLifecycleVisualizer}
      onclick={() => settings.toggleLifecycleVisualizer()}
      title="Toggle Lifecycle Visualizer"
    >
      <Menu size={16} />
    </button>

    <!-- Settings -->
    <button 
      class="header-btn"
      onclick={() => showSettingsPanel = !showSettingsPanel}
      title="Settings"
    >
      <Settings size={16} />
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    gap: 1rem;
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--accent-blue);
  }

  .logo-text {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-primary);
  }

  .version {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-muted);
  }

  .webhook-url {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .webhook-url .label {
    color: var(--text-muted);
  }

  .webhook-url code {
    padding: 0.25rem 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--accent-green);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    color: var(--accent-red);
  }

  .status-indicator.connected {
    color: var(--accent-green);
  }

  .header-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .header-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .header-btn.active {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: var(--accent-blue);
    color: var(--accent-blue);
  }
</style>
