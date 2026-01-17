<script lang="ts">
  import { ChevronRight, ChevronDown, Copy, Check, AlertTriangle } from 'lucide-svelte';
  import type { Message } from '$lib/types/ucp';

  interface Props {
    data: unknown;
    errors?: Message[];
    expandLevel?: number;
  }

  let { data, errors = [], expandLevel = 2 }: Props = $props();

  let copied = $state(false);

  // Extract error paths for highlighting
  const errorPaths = $derived(new Set(errors?.map(e => e.path).filter((p): p is string => p !== undefined) || []));

  function copyToClipboard() {
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }
</script>

<div class="json-viewer">
  <div class="viewer-toolbar">
    <button class="copy-btn" onclick={copyToClipboard} title="Copy JSON">
      {#if copied}
        <Check size={14} />
        <span>Copied!</span>
      {:else}
        <Copy size={14} />
        <span>Copy</span>
      {/if}
    </button>

    {#if errors && errors.length > 0}
      <div class="warning-summary">
        <AlertTriangle size={14} />
        <span>{errors.length} validation {errors.length === 1 ? 'warning' : 'warnings'}</span>
      </div>
    {/if}
  </div>

  {#if errors && errors.length > 0}
    <div class="warning-list">
      {#each errors as error}
        <div class="warning-item">
          <AlertTriangle size={12} />
          <span class="warning-path">{error.path || 'root'}</span>
          <span class="warning-message">{error.content}</span>
        </div>
      {/each}
    </div>
  {/if}

  <pre class="json-content"><code>{@html formatJson(data, 0, expandLevel, errorPaths)}</code></pre>
</div>

<script module lang="ts">
  function formatJson(
    value: unknown, 
    indent: number = 0, 
    expandLevel: number = 2, 
    errorPaths: Set<string> = new Set(),
    currentPath: string = '$'
  ): string {
    const indentStr = '  '.repeat(indent);
    const hasError = errorPaths.has(currentPath);
    const errorClass = hasError ? ' schema-error' : '';

    if (value === null) {
      return `<span class="json-null${errorClass}">null</span>`;
    }

    if (value === undefined) {
      return `<span class="json-null${errorClass}">undefined</span>`;
    }

    if (typeof value === 'boolean') {
      return `<span class="json-boolean${errorClass}">${value}</span>`;
    }

    if (typeof value === 'number') {
      return `<span class="json-number${errorClass}">${value}</span>`;
    }

    if (typeof value === 'string') {
      const escaped = escapeHtml(value);
      // Detect URLs
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return `<span class="json-string${errorClass}">"<a href="${escaped}" target="_blank" rel="noopener">${escaped}</a>"</span>`;
      }
      return `<span class="json-string${errorClass}">"${escaped}"</span>`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return `<span class="json-bracket${errorClass}">[]</span>`;
      }

      const items = value.map((item, index) => {
        const itemPath = `${currentPath}[${index}]`;
        return `${indentStr}  ${formatJson(item, indent + 1, expandLevel, errorPaths, itemPath)}`;
      });

      return `<span class="json-bracket">[</span>\n${items.join(',\n')}\n${indentStr}<span class="json-bracket">]</span>`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      
      if (entries.length === 0) {
        return `<span class="json-bracket${errorClass}">{}</span>`;
      }

      const items = entries.map(([key, val]) => {
        const keyPath = `${currentPath}.${key}`;
        const keyHasError = errorPaths.has(keyPath);
        const keyClass = keyHasError ? ' schema-error' : '';
        
        return `${indentStr}  <span class="json-key${keyClass}">"${escapeHtml(key)}"</span>: ${formatJson(val, indent + 1, expandLevel, errorPaths, keyPath)}`;
      });

      return `<span class="json-bracket">{</span>\n${items.join(',\n')}\n${indentStr}<span class="json-bracket">}</span>`;
    }

    return String(value);
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
</script>

<style>
  .json-viewer {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .viewer-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0.75rem;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
  }

  .warning-summary {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--accent-yellow);
    font-size: 0.8125rem;
  }

  .warning-list {
    background-color: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--accent-yellow);
    margin-bottom: 0.375rem;
  }

  .warning-item:last-child {
    margin-bottom: 0;
  }

  .warning-path {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    background-color: rgba(234, 179, 8, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
  }

  .warning-message {
    flex: 1;
    color: var(--text-secondary);
  }

  .json-content {
    flex: 1;
    overflow: auto;
    margin: 0;
    padding: 0;
    background-color: transparent;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  .json-content code {
    display: block;
    white-space: pre;
  }

  :global(.json-key) {
    color: #7dd3fc;
  }

  :global(.json-string) {
    color: #a5f3fc;
  }

  :global(.json-string a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.json-string a:hover) {
    color: var(--accent-blue);
  }

  :global(.json-number) {
    color: #fcd34d;
  }

  :global(.json-boolean) {
    color: #c4b5fd;
  }

  :global(.json-null) {
    color: #f87171;
  }

  :global(.json-bracket) {
    color: #94a3b8;
  }

  :global(.schema-error) {
    background-color: rgba(239, 68, 68, 0.2);
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
