// Transaction and Message Correlation Store
import { writable, derived, get } from 'svelte/store';
import type {
    Transaction,
    CorrelatedMessage,
    UCPAction,
    Message
} from '$lib/types/ucp';

// ============================================================================
// Transaction Store
// ============================================================================

function createTransactionStore() {
    const { subscribe, update, set } = writable<Map<string, Transaction>>(new Map());

    return {
        subscribe,

        // Add a new transaction
        addTransaction(id: string, serverUrl?: string): void {
            update(transactions => {
                if (!transactions.has(id)) {
                    transactions.set(id, {
                        id,
                        status: 'pending',
                        messages: [],
                        serverUrl,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
                return new Map(transactions);
            });
        },

        // Add a request message to a transaction
        addRequest(
            transactionId: string,
            messageId: string,
            action: UCPAction,
            payload: unknown
        ): string {
            const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            update(transactions => {
                let transaction = transactions.get(transactionId);

                if (!transaction) {
                    transaction = {
                        id: transactionId,
                        status: 'pending',
                        messages: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    transactions.set(transactionId, transaction);
                }

                const message: CorrelatedMessage = {
                    id,
                    transactionId,
                    messageId,
                    type: 'request',
                    action,
                    payload,
                    timestamp: new Date(),
                    status: 'pending',
                };

                transaction.messages.push(message);
                transaction.updatedAt = new Date();

                return new Map(transactions);
            });

            return id;
        },

        // Add a response message and correlate with request
        addResponse(
            transactionId: string,
            messageId: string,
            action: UCPAction,
            payload: unknown,
            parentId: string,
            errors?: Message[]
        ): string {
            const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            update(transactions => {
                const transaction = transactions.get(transactionId);

                if (!transaction) {
                    console.warn(`Transaction ${transactionId} not found for response`);
                    return transactions;
                }

                // Find parent request and update its status
                const parentRequest = transaction.messages.find(m => m.id === parentId);
                if (parentRequest) {
                    parentRequest.status = errors && errors.length > 0 ? 'failed' : 'completed';
                    parentRequest.duration = new Date().getTime() - parentRequest.timestamp.getTime();
                }

                const message: CorrelatedMessage = {
                    id,
                    transactionId,
                    messageId,
                    type: 'response',
                    action,
                    payload,
                    parentId,
                    timestamp: new Date(),
                    status: errors && errors.length > 0 ? 'failed' : 'completed',
                    errors,
                };

                transaction.messages.push(message);
                transaction.updatedAt = new Date();

                // Update transaction status based on action
                if (action === 'complete_checkout' && !errors) {
                    transaction.status = 'completed';
                } else if (action === 'cancel_checkout') {
                    transaction.status = 'failed';
                }

                return new Map(transactions);
            });

            return id;
        },

        // Add a webhook message (may be orphan if no matching request)
        addWebhook(
            transactionId: string,
            messageId: string,
            action: UCPAction,
            payload: unknown
        ): string {
            const id = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            update(transactions => {
                let transaction = transactions.get(transactionId);
                let isOrphan = false;

                if (!transaction) {
                    // Create orphan transaction for unmatched webhooks
                    transaction = {
                        id: transactionId,
                        status: 'pending',
                        messages: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    transactions.set(transactionId, transaction);
                    isOrphan = true;
                }

                const message: CorrelatedMessage = {
                    id,
                    transactionId,
                    messageId,
                    type: 'webhook',
                    action,
                    payload,
                    timestamp: new Date(),
                    status: 'completed',
                    isOrphan,
                };

                transaction.messages.push(message);
                transaction.updatedAt = new Date();

                return new Map(transactions);
            });

            return id;
        },

        // Get a specific transaction
        getTransaction(id: string): Transaction | undefined {
            return get({ subscribe }).get(id);
        },

        // Get all orphan messages
        getOrphans(): CorrelatedMessage[] {
            const transactions = get({ subscribe });
            const orphans: CorrelatedMessage[] = [];

            transactions.forEach(transaction => {
                transaction.messages.forEach(message => {
                    if (message.isOrphan) {
                        orphans.push(message);
                    }
                });
            });

            return orphans;
        },

        // Clear all transactions
        clear(): void {
            set(new Map());
        },

        // Update transaction status
        updateStatus(id: string, status: Transaction['status']): void {
            update(transactions => {
                const transaction = transactions.get(id);
                if (transaction) {
                    transaction.status = status;
                    transaction.updatedAt = new Date();
                }
                return new Map(transactions);
            });
        },
    };
}

export const transactions = createTransactionStore();

// ============================================================================
// Derived Stores
// ============================================================================

// List of all transactions, sorted by creation date (newest first)
export const transactionList = derived(transactions, ($transactions) => {
    return Array.from($transactions.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
});

// Count of orphan messages
export const orphanCount = derived(transactions, ($transactions) => {
    let count = 0;
    $transactions.forEach(transaction => {
        transaction.messages.forEach(message => {
            if (message.isOrphan) count++;
        });
    });
    return count;
});

// Currently selected transaction and message for viewing
export const selectedTransactionId = writable<string | null>(null);
export const selectedMessageId = writable<string | null>(null);

// Selected transaction (derived)
export const selectedTransaction = derived(
    [transactions, selectedTransactionId],
    ([$transactions, $selectedId]) => {
        if (!$selectedId) return null;
        return $transactions.get($selectedId) ?? null;
    }
);

// Selected message (derived)
export const selectedMessage = derived(
    [selectedTransaction, selectedMessageId],
    ([$transaction, $messageId]) => {
        if (!$transaction || !$messageId) return null;
        return $transaction.messages.find(m => m.id === $messageId) ?? null;
    }
);

// ============================================================================
// Filter by Lifecycle Stage
// ============================================================================

export const lifecycleFilter = writable<UCPAction | null>(null);

export const filteredMessages = derived(
    [selectedTransaction, lifecycleFilter],
    ([$transaction, $filter]) => {
        if (!$transaction) return [];
        if (!$filter) return $transaction.messages;
        return $transaction.messages.filter(m => m.action === $filter);
    }
);
