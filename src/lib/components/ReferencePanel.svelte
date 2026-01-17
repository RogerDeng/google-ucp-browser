<script lang="ts">
  import { AlertTriangle, FileText, Copy, Check, X } from 'lucide-svelte';
  import type { UCPAction } from '$lib/types/ucp';
  import { referenceTemplates } from '$lib/templates';

  interface Props {
    action?: UCPAction;
    onClose?: () => void;
  }

  let { action, onClose }: Props = $props();

  let copied = $state(false);

  const template = $derived(action ? referenceTemplates[action] : null);

  function copyTemplate() {
    if (!template) return;
    
    navigator.clipboard.writeText(JSON.stringify(template.example, null, 2)).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }
</script>

<div class="reference-panel">
  <div class="panel-header">
    <FileText size={16} />
    <span>Reference Template</span>
    {#if template}
      <button class="copy-btn" onclick={copyTemplate}>
        {#if copied}
          <Check size={14} />
        {:else}
          <Copy size={14} />
        {/if}
      </button>
    {/if}
    {#if onClose}
      <button class="close-btn" onclick={onClose} title="Hide Reference Template">
        <X size={16} />
      </button>
    {/if}
  </div>

  <div class="panel-content">
    <!-- Disclaimer Banner -->
    <div class="disclaimer-banner">
      <AlertTriangle size={18} />
      <div>
        <p><strong>⚠️ Standard Sample Only</strong></p>
        <p>此為標準範例，請務必依實際商品替換數值</p>
        <p class="english">Please replace with actual data. Do not copy directly for production use.</p>
      </div>
    </div>

    {#if template}
      <div class="template-info">
        <h3>{template.title}</h3>
        <p class="description">{template.description}</p>
        
        {#if template.docUrl}
          <a href={template.docUrl} target="_blank" rel="noopener" class="doc-link">
            View Official Documentation →
          </a>
        {/if}
      </div>

      <div class="template-code">
        <pre><code>{JSON.stringify(template.example, null, 2)}</code></pre>
      </div>
    {:else}
      <div class="no-template">
        <FileText size={48} class="text-muted" />
        <p>Select a message to view its reference template</p>
        <p class="hint">Reference templates show the standard UCP format for each action type</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .reference-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
  }

  .copy-btn {
    margin-left: auto;
    padding: 0.375rem;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .close-btn {
    padding: 0.375rem;
    background-color: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
  }

  .panel-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .disclaimer-banner {
    background-color: rgba(234, 179, 8, 0.15);
    border: 1px solid var(--accent-yellow);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    gap: 0.75rem;
  }

  .disclaimer-banner > :global(svg) {
    flex-shrink: 0;
    color: var(--accent-yellow);
    margin-top: 2px;
  }

  .disclaimer-banner p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--accent-yellow);
  }

  .disclaimer-banner p.english {
    color: var(--text-muted);
    font-size: 0.8125rem;
    margin-top: 0.25rem;
  }

  .template-info {
    margin-bottom: 1rem;
  }

  .template-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .template-info .description {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .doc-link {
    display: inline-flex;
    align-items: center;
    font-size: 0.875rem;
    color: var(--accent-blue);
    text-decoration: none;
  }

  .doc-link:hover {
    text-decoration: underline;
  }

  .template-code {
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    overflow: hidden;
  }

  .template-code pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .template-code code {
    display: block;
    white-space: pre;
  }

  .no-template {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
    gap: 1rem;
  }

  .no-template p {
    margin: 0;
  }

  .no-template .hint {
    font-size: 0.875rem;
  }

  .text-muted {
    color: var(--text-muted);
  }
</style>
