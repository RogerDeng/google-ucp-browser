import { writable, derived } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export interface CartItem {
    product_id: string;
    sku?: string;
    name?: string;
    price?: number;
    quantity: number;
}

export interface Cart {
    id: string | null;
    items: CartItem[];
    total: number;
    currency: string;
    createdAt: string | null;
}

// ============================================================================
// Cart Store
// ============================================================================

const initialCart: Cart = {
    id: null,
    items: [],
    total: 0,
    currency: 'TWD',
    createdAt: null,
};

function createCartStore() {
    const { subscribe, set, update } = writable<Cart>(initialCart);

    return {
        subscribe,

        // Set cart from server response
        setCart(cart: unknown): void {
            if (!cart || typeof cart !== 'object') return;

            const c = cart as Record<string, unknown>;
            update(state => ({
                ...state,
                id: (c.id || c.cart_id || state.id) as string | null,
                items: Array.isArray(c.items) ? c.items.map((item: unknown) => {
                    const i = item as Record<string, unknown>;
                    return {
                        product_id: (i.product_id || i.id) as string,
                        sku: i.sku as string | undefined,
                        name: i.name as string | undefined,
                        price: typeof i.price === 'number' ? i.price :
                            (typeof i.price === 'object' && i.price !== null
                                ? (i.price as Record<string, unknown>).amount as number
                                : undefined),
                        quantity: typeof i.quantity === 'number' ? i.quantity : 1,
                    };
                }) : state.items,
                total: typeof c.total === 'number' ? c.total :
                    (typeof c.total === 'object' && c.total !== null
                        ? (c.total as Record<string, unknown>).amount as number
                        : state.total),
                currency: (c.currency || state.currency) as string,
                createdAt: c.created_at as string | null || state.createdAt,
            }));
        },

        // Add item locally (optimistic update)
        addItem(item: CartItem): void {
            update(state => {
                const existingIndex = state.items.findIndex(
                    i => i.product_id === item.product_id
                );

                let newItems: CartItem[];
                if (existingIndex >= 0) {
                    newItems = [...state.items];
                    newItems[existingIndex] = {
                        ...newItems[existingIndex],
                        quantity: newItems[existingIndex].quantity + item.quantity,
                    };
                } else {
                    newItems = [...state.items, item];
                }

                const newTotal = newItems.reduce(
                    (sum, i) => sum + (i.price || 0) * i.quantity,
                    0
                );

                return {
                    ...state,
                    items: newItems,
                    total: newTotal,
                };
            });
        },

        // Remove item
        removeItem(productId: string): void {
            update(state => {
                const newItems = state.items.filter(i => i.product_id !== productId);
                const newTotal = newItems.reduce(
                    (sum, i) => sum + (i.price || 0) * i.quantity,
                    0
                );
                return {
                    ...state,
                    items: newItems,
                    total: newTotal,
                };
            });
        },

        // Update quantity
        updateQuantity(productId: string, quantity: number): void {
            update(state => {
                const newItems = state.items.map(item =>
                    item.product_id === productId
                        ? { ...item, quantity: Math.max(1, quantity) }
                        : item
                );
                const newTotal = newItems.reduce(
                    (sum, i) => sum + (i.price || 0) * i.quantity,
                    0
                );
                return {
                    ...state,
                    items: newItems,
                    total: newTotal,
                };
            });
        },

        // Clear cart
        clear(): void {
            set(initialCart);
        },

        // Get item count
        getItemCount(): number {
            let count = 0;
            subscribe(state => {
                count = state.items.reduce((sum, item) => sum + item.quantity, 0);
            })();
            return count;
        },
    };
}

export const cart = createCartStore();

// Derived store for item count
export const cartItemCount = derived(cart, $cart =>
    $cart.items.reduce((sum, item) => sum + item.quantity, 0)
);
