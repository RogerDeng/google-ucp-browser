<script lang="ts">
  import { ChevronRight, ChevronDown, Circle, AlertCircle, CheckCircle2, Clock, Timer } from 'lucide-svelte';
  import type { Transaction, CorrelatedMessage } from '$lib/types/ucp';

  interface Props {
    transactions: Transaction[];
    selectedTransactionId: string | null;
    selectedMessageId: string | null;
    onSelectTransaction: (id: string) => void;
    onSelectMessage: (id: string) => void;
  }

  let { 
    transactions, 
    selectedTransactionId, 
    selectedMessageId,
    onSelectTransaction,
    onSelectMessage 
  }: Props = $props();

  let expandedTransactions = $state<Set<string>>(new Set());

  function toggleExpand(id: string) {
    const newSet = new Set(expandedTransactions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedTransactions = newSet;
  }

  function handleTransactionClick(id: string) {
    onSelectTransaction(id);
    if (!expandedTransactions.has(id)) {
      toggleExpand(id);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return AlertCircle;
      case 'pending':
        return Clock;
      default:
        return Circle;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'var(--accent-green)';
      case 'failed':
        return 'var(--accent-red)';
      case 'pending':
        return 'var(--accent-yellow)';
      default:
        return 'var(--text-muted)';
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  function formatFullDate(date: Date): string {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function formatDuration(ms: number | undefined): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function getTransactionLabel(transaction: Transaction): string {
    // Get first action as label
    const firstMsg = transaction.messages[0];
    if (firstMsg) {
      return formatAction(firstMsg.action);
    }
    return transaction.id.slice(0, 16);
  }
</script>

<div class="transaction-tree">
  {#if transactions.length === 0}
    <div class="empty-tree">
      <p>No transactions yet</p>
      <p class="hint">Enter a server URL and click Discover to start</p>
    </div>
  {:else}
    {#each transactions as transaction (transaction.id)}
      {@const isExpanded = expandedTransactions.has(transaction.id)}
      {@const isSelected = selectedTransactionId === transaction.id}
      {@const StatusIcon = getStatusIcon(transaction.status)}
      
      <div class="transaction-item">
        <button 
          class="transaction-header"
          class:selected={isSelected}
          onclick={() => handleTransactionClick(transaction.id)}
          title={`ID: ${transaction.id}\n建立: ${formatFullDate(transaction.createdAt)}`}
        >
          <span class="expand-icon">
            {#if isExpanded}
              <ChevronDown size={14} />
            {:else}
              <ChevronRight size={14} />
            {/if}
          </span>
          
          <span class="status-icon" style="color: {getStatusColor(transaction.status)}">
            <StatusIcon size={14} />
          </span>
          
          <span class="transaction-label">
            {getTransactionLabel(transaction)}
          </span>
          
          <span class="transaction-time">
            {formatTime(transaction.createdAt)}
          </span>
          
          <span class="message-count">
            {transaction.messages.length}
          </span>
        </button>

        {#if isExpanded}
          <div class="message-list">
            {#each transaction.messages as message (message.id)}
              {@const MsgStatusIcon = getStatusIcon(message.status || 'pending')}
              {@const isMessageSelected = selectedMessageId === message.id}
              
              <button 
                class="message-item"
                class:selected={isMessageSelected}
                class:orphan={message.isOrphan}
                onclick={() => onSelectMessage(message.id)}
              >
                <span class="message-type" class:request={message.type === 'request'} class:response={message.type === 'response'} class:webhook={message.type === 'webhook'}>
                  {message.type.charAt(0).toUpperCase()}
                </span>
                
                <span class="message-action">
                  {formatAction(message.action)}
                </span>
                
                <span class="message-time">
                  {formatTime(message.timestamp)}
                </span>

                {#if message.isOrphan}
                  <span class="orphan-badge" title="Orphan Message - No matching request found">
                    <AlertCircle size={12} />
                  </span>
                {/if}

                {#if message.duration}
                  <span class="duration-badge" title="Response time: {message.duration}ms">
                    <Timer size={10} />
                    {formatDuration(message.duration)}
                  </span>
                {/if}

                <span class="message-status" style="color: {getStatusColor(message.status || 'pending')}">
                  <MsgStatusIcon size={12} />
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .transaction-tree {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .empty-tree {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text-muted);
    text-align: center;
  }

  .empty-tree p {
    margin: 0;
  }

  .empty-tree .hint {
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }

  .transaction-item {
    margin-bottom: 0.25rem;
  }

  .transaction-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background-color: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }

  .transaction-header:hover {
    background-color: var(--bg-tertiary);
  }

  .transaction-header.selected {
    background-color: rgba(59, 130, 246, 0.15);
  }

  .expand-icon {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }

  .status-icon {
    display: flex;
    align-items: center;
  }

  .transaction-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .transaction-time {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  .message-count {
    background-color: var(--bg-tertiary);
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .message-list {
    margin-left: 1.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid var(--border-color);
  }

  .message-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    background-color: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }

  .message-item:hover {
    background-color: var(--bg-tertiary);
  }

  .message-item.selected {
    background-color: rgba(59, 130, 246, 0.1);
    color: var(--text-primary);
  }

  .message-item.orphan {
    border-left: 2px solid var(--accent-yellow);
  }

  .message-type {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
  }

  .message-type.request {
    background-color: rgba(59, 130, 246, 0.2);
    color: var(--accent-blue);
  }

  .message-type.response {
    background-color: rgba(34, 197, 94, 0.2);
    color: var(--accent-green);
  }

  .message-type.webhook {
    background-color: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  }

  .message-action {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message-time {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  .orphan-badge {
    color: var(--accent-yellow);
    display: flex;
    align-items: center;
  }

  .message-status {
    display: flex;
    align-items: center;
  }

  .duration-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    color: var(--text-muted);
    background-color: rgba(100, 100, 100, 0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
