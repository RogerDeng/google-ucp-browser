<script lang="ts">
  import { X, Wifi, WifiOff, RefreshCw, ExternalLink, Eye, EyeOff } from 'lucide-svelte';
  import { tunnelConfig, tunnelStatus, tunnelConnecting, webhookUrl } from '$lib/stores/tunnel';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let authtoken = $state('');
  let port = $state(8000);
  let showToken = $state(false);
  let error = $state<string | null>(null);

  // Initialize from store
  $effect(() => {
    const unsubscribe = tunnelConfig.subscribe(config => {
      authtoken = config.authtoken;
      port = config.port;
    });
    return unsubscribe;
  });

  async function handleConnect() {
    if (!authtoken) {
      error = 'Please enter your ngrok authtoken';
      return;
    }

    error = null;
    tunnelConnecting.set(true);
    tunnelConfig.setAuthtoken(authtoken);
    tunnelConfig.setPort(port);

    try {
      const response = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authtoken, port })
      });

      const result = await response.json();

      if (result.success) {
        tunnelStatus.setConnected(result.publicUrl, port);
      } else {
        const errorMsg = result.error || 'Failed to start tunnel';
        error = errorMsg;
        tunnelStatus.setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      error = errorMsg;
      tunnelStatus.setError(errorMsg);
    } finally {
      tunnelConnecting.set(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetch('/api/tunnel', { method: 'DELETE' });
      tunnelStatus.setDisconnected();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }
</script>

<div class="tunnel-manager">
  <div class="manager-header">
    <h2>Tunnel Manager</h2>
    <button class="close-btn" onclick={onClose}>
      <X size={20} />
    </button>
  </div>

  <div class="manager-content">
    <!-- Status -->
    <div class="status-section">
      <div class="status-indicator" class:connected={$tunnelStatus.connected}>
        {#if $tunnelStatus.connected}
          <Wifi size={24} />
          <span>Connected</span>
        {:else}
          <WifiOff size={24} />
          <span>Disconnected</span>
        {/if}
      </div>

      {#if $tunnelStatus.connected && $webhookUrl}
        <div class="public-url">
          <label>Public Webhook URL</label>
          <div class="url-display">
            <code>{$webhookUrl}</code>
            <a href={$webhookUrl} target="_blank" rel="noopener" class="external-link">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      {/if}
    </div>

    <!-- Configuration -->
    <div class="config-section">
      <div class="form-group">
        <label for="authtoken">ngrok Authtoken</label>
        <div class="input-with-toggle">
          <input 
            id="authtoken"
            type={showToken ? 'text' : 'password'}
            class="input"
            placeholder="Enter your ngrok authtoken"
            bind:value={authtoken}
            disabled={$tunnelStatus.connected}
          />
          <button 
            class="toggle-btn" 
            onclick={() => showToken = !showToken}
            type="button"
          >
            {#if showToken}
              <EyeOff size={16} />
            {:else}
              <Eye size={16} />
            {/if}
          </button>
        </div>
        <p class="help-text">
          Get your authtoken from <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noopener">ngrok dashboard</a>
        </p>
      </div>

      <div class="form-group">
        <label for="port">Local Port</label>
        <input 
          id="port"
          type="number"
          class="input"
          min="1"
          max="65535"
          bind:value={port}
          disabled={$tunnelStatus.connected}
        />
        <p class="help-text">
          The port where this application is running (default: 5173 for dev, 3000 for production)
        </p>
      </div>

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <div class="actions">
        {#if $tunnelStatus.connected}
          <button class="btn btn-danger" onclick={handleDisconnect}>
            <WifiOff size={16} />
            Disconnect
          </button>
        {:else}
          <button 
            class="btn btn-success" 
            onclick={handleConnect}
            disabled={$tunnelConnecting}
          >
            {#if $tunnelConnecting}
              <RefreshCw size={16} class="animate-spin" />
              Connecting...
            {:else}
              <Wifi size={16} />
              Connect
            {/if}
          </button>
        {/if}
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <h3>How it works</h3>
      <ol>
        <li>Enter your ngrok authtoken from your ngrok account</li>
        <li>Set the local port (where this app is running)</li>
        <li>Click Connect to create a public tunnel</li>
        <li>Use the webhook URL in your UCP server configuration</li>
        <li>Incoming webhooks will appear in the debugger</li>
      </ol>
    </div>
  </div>
</div>

<style>
  .tunnel-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .manager-header h2 {
    margin: 0;
    font-size: 1.125rem;
  }

  .close-btn {
    padding: 0.375rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }

  .close-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .manager-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .status-section {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 1rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent-red);
    margin-bottom: 1rem;
  }

  .status-indicator.connected {
    color: var(--accent-green);
  }

  .public-url {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .public-url label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .url-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--bg-tertiary);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
  }

  .url-display code {
    flex: 1;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: var(--accent-green);
    word-break: break-all;
  }

  .external-link {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }

  .external-link:hover {
    color: var(--accent-blue);
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .input-with-toggle {
    display: flex;
    position: relative;
  }

  .input-with-toggle .input {
    padding-right: 2.5rem;
  }

  .toggle-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .toggle-btn:hover {
    color: var(--text-primary);
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .help-text a {
    color: var(--accent-blue);
  }

  .error-message {
    padding: 0.75rem;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: var(--accent-red);
    font-size: 0.875rem;
  }

  .actions {
    margin-top: 0.5rem;
  }

  .actions .btn {
    width: 100%;
    justify-content: center;
  }

  .instructions {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .instructions h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .instructions ol {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.8;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }
</style>
