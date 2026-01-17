<script lang="ts">
  import { ArrowRight, CheckCircle2, Clock, XCircle, Play } from 'lucide-svelte';
  import type { Transaction, UCPAction, LifecycleStage, StageStatus } from '$lib/types/ucp';

  interface Props {
    transaction: Transaction;
    onStageClick?: (action: UCPAction | null) => void;
    onActionExecute?: (stage: LifecycleStage) => void;
  }

  let { transaction, onStageClick, onActionExecute }: Props = $props();

  interface LifecycleNode {
    id: LifecycleStage;
    label: string;
    actions: UCPAction[];
  }

  const lifecycleStages: LifecycleNode[] = [
    { id: 'discover', label: 'Discover', actions: ['discover'] },
    { id: 'create', label: 'Create', actions: ['create_checkout'] },
    { id: 'update', label: 'Update', actions: ['update_checkout', 'get_checkout'] },
    { id: 'complete', label: 'Complete', actions: ['complete_checkout', 'cancel_checkout'] },
    { id: 'order', label: 'Order', actions: ['webhook'] },
  ];

  function getStageStatus(stage: LifecycleNode): StageStatus {
    const actions = stage.actions;
    const messages = transaction.messages.filter(m => actions.includes(m.action));
    
    if (messages.length === 0) return 'idle';
    
    const hasCompleted = messages.some(m => m.status === 'completed' && m.type === 'response');
    const hasFailed = messages.some(m => m.status === 'failed');
    const hasPending = messages.some(m => m.status === 'pending');
    
    if (hasFailed) return 'failed';
    if (hasCompleted) return 'completed';
    if (hasPending) return 'pending';
    
    return 'idle';
  }

  function getStatusIcon(status: StageStatus) {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return null;
    }
  }

  function handleNodeClick(stage: LifecycleNode) {
    // Toggle filter - click again to clear
    onStageClick?.(stage.actions[0]);
  }

  function handleExecuteAction(e: MouseEvent, stage: LifecycleNode) {
    e.stopPropagation();
    onActionExecute?.(stage.id);
  }
</script>

<div class="lifecycle-visualizer">
  <div class="lifecycle-flow">
    {#each lifecycleStages as stage, index (stage.id)}
      {@const status = getStageStatus(stage)}
      {@const StatusIcon = getStatusIcon(status)}
      
      {#if index > 0}
        <div class="flow-arrow">
          <ArrowRight size={20} />
        </div>
      {/if}

      <div class="stage-container">
        <div 
          class="lifecycle-node {status}"
          class:pulse-pending={status === 'pending'}
          onclick={() => handleNodeClick(stage)}
          onkeydown={(e) => e.key === 'Enter' && handleNodeClick(stage)}
          role="button"
          tabindex="0"
          title="Click to filter messages"
        >
          {#if StatusIcon}
            <span class="node-icon">
              <StatusIcon size={16} />
            </span>
          {/if}
          <span class="node-label">{stage.label}</span>
        </div>
        
        {#if onActionExecute && stage.id !== 'discover'}
          <button 
            class="execute-btn"
            onclick={(e) => handleExecuteAction(e, stage)}
            title="Execute {stage.label}"
          >
            <Play size={12} />
          </button>
        {/if}
      </div>
    {/each}
  </div>
  
  <button class="clear-filter" onclick={() => onStageClick?.(null)}>
    Clear Filter
  </button>
</div>

<style>
  .lifecycle-visualizer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .lifecycle-flow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .flow-arrow {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }

  .lifecycle-node {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 9999px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .lifecycle-node:hover {
    border-color: var(--accent-blue);
    color: var(--text-primary);
  }

  .lifecycle-node.idle {
    opacity: 0.6;
  }

  .lifecycle-node.completed {
    background-color: rgba(34, 197, 94, 0.15);
    border-color: var(--accent-green);
    color: var(--accent-green);
  }

  .lifecycle-node.pending {
    background-color: rgba(234, 179, 8, 0.15);
    border-color: var(--accent-yellow);
    color: var(--accent-yellow);
  }

  .lifecycle-node.failed {
    background-color: rgba(239, 68, 68, 0.15);
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  .lifecycle-node.pulse-pending {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 5px var(--accent-yellow);
    }
    50% {
      box-shadow: 0 0 20px var(--accent-yellow), 0 0 30px var(--accent-yellow);
    }
  }

  .node-icon {
    display: flex;
    align-items: center;
  }

  .node-label {
    white-space: nowrap;
  }

  .execute-btn {
    display: none;
    position: absolute;
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.25rem;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
    z-index: 10;
  }

  .stage-container:hover .execute-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .execute-btn:hover {
    background-color: var(--accent-purple);
    transform: translateY(-50%) scale(1.1);
  }

  .stage-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .lifecycle-node {
    position: relative;
  }

  .clear-filter {
    padding: 0.375rem 0.75rem;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-filter:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
</style>
