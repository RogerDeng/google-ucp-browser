// UCP REST Client - BAP (Buyer App Protocol) implementation
import type {
    UCPProfile,
    CheckoutSession,
    CreateCheckoutRequest,
    UpdateCheckoutRequest,
    CompleteCheckoutRequest,
} from '$lib/types/ucp';
import {
    validateCheckoutSession,
    validateUCPProfile,
    type ValidationResult
} from '$lib/schemas/ucp';

export interface ProxyResponse<T> {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: T;
    error?: string;
}

export interface UCPClientConfig {
    baseUrl: string;
    platformProfile?: string;
    apiKey?: string;
}

export class UCPClient {
    private baseUrl: string;
    private platformProfile: string;
    private proxyUrl: string;
    private apiKey: string;

    constructor(config: UCPClientConfig) {
        this.baseUrl = this.normalizeUrl(config.baseUrl);
        this.platformProfile = config.platformProfile || 'https://ucp-browser.local/profile';
        this.proxyUrl = '/api/proxy';
        this.apiKey = config.apiKey || '';
    }

    private normalizeUrl(url: string): string {
        // Remove trailing slash
        let normalized = url.replace(/\/$/, '');
        // Add http:// if no protocol specified
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = `http://${normalized}`;
        }
        return normalized;
    }


    // ============================================================================
    // Discovery
    // ============================================================================

    async discover(): Promise<{ profile: UCPProfile; validation: ValidationResult<unknown> }> {
        const url = `${this.baseUrl}/.well-known/ucp`;
        const response = await this.proxyFetch<UCPProfile>(url, { method: 'GET' });

        if (response.error) {
            throw new Error(`Discovery failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Discovery failed with status ${response.status}: ${response.statusText}`);
        }

        const validation = validateUCPProfile(response.data);

        return {
            profile: response.data,
            validation,
        };
    }

    // ============================================================================
    // Products
    // ============================================================================

    async getProducts(productsEndpoint?: string): Promise<{ products: unknown[]; raw: unknown }> {
        // Use provided endpoint or default to /products
        const endpoint = productsEndpoint || `${this.baseUrl}/products`;
        const response = await this.proxyFetch<unknown>(endpoint, { method: 'GET' });

        if (response.error) {
            throw new Error(`Get products failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Get products failed with status ${response.status}: ${response.statusText}`);
        }

        // Handle various response formats
        let products: unknown[] = [];
        const data = response.data;

        if (Array.isArray(data)) {
            products = data;
        } else if (data && typeof data === 'object') {
            // Check for common wrapper patterns
            const obj = data as Record<string, unknown>;
            if (Array.isArray(obj.products)) {
                products = obj.products;
            } else if (Array.isArray(obj.items)) {
                products = obj.items;
            } else if (Array.isArray(obj.data)) {
                products = obj.data;
            } else {
                // Maybe it's an object with numeric keys (like your server returns)
                const values = Object.values(obj);
                if (values.length > 0 && values.every(v => v && typeof v === 'object')) {
                    products = values;
                }
            }
        }

        return {
            products,
            raw: response.data,
        };
    }

    async getProductById(
        productId: string,
        baseEndpoint?: string
    ): Promise<{ product: unknown; raw: unknown }> {
        // Use provided base endpoint or default to baseUrl
        const endpoint = baseEndpoint
            ? `${baseEndpoint.replace(/\/$/, '')}/${productId}`
            : `${this.baseUrl}/products/${productId}`;

        const response = await this.proxyFetch<unknown>(endpoint, { method: 'GET' });

        if (response.error) {
            throw new Error(`Get product failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Get product failed with status ${response.status}: ${response.statusText}`);
        }

        // Handle various response formats
        let product: unknown = null;
        const data = response.data;

        if (data && typeof data === 'object') {
            const obj = data as Record<string, unknown>;
            // Check if response has a product wrapper
            if (obj.product) {
                product = obj.product;
            } else if (obj.data && typeof obj.data === 'object') {
                product = obj.data;
            } else {
                // Assume the response is the product itself
                product = data;
            }
        }

        return {
            product,
            raw: response.data,
        };
    }

    // ============================================================================
    // Cart Operations (UCP Shopping Agent)
    // ============================================================================

    /**
     * Get the cart API base endpoint from discovered UCP profile
     */
    getCartEndpoint(): string {
        // UCP Shopping Agent uses /wp-json/ucp/v1/carts
        return `${this.baseUrl}/wp-json/ucp/v1/carts`;
    }

    /**
     * Create a new cart - POST /carts
     */
    async createCart(): Promise<{ cart: unknown; raw: unknown }> {
        const endpoint = this.getCartEndpoint();

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'POST',
            body: JSON.stringify({}),
        });

        if (response.error) {
            throw new Error(`Create cart failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Create cart failed with status ${response.status}: ${response.statusText}`);
        }

        let cart: unknown = response.data;
        if (response.data && typeof response.data === 'object') {
            const obj = response.data as Record<string, unknown>;
            if (obj.cart) cart = obj.cart;
        }

        return { cart, raw: response.data };
    }

    /**
     * Get cart by ID - GET /carts/{id}
     */
    async getCart(cartId: string): Promise<{ cart: unknown; raw: unknown }> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}`;

        const response = await this.proxyFetch<unknown>(endpoint, { method: 'GET' });

        if (response.error) {
            throw new Error(`Get cart failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Get cart failed with status ${response.status}: ${response.statusText}`);
        }

        let cart: unknown = response.data;
        if (response.data && typeof response.data === 'object') {
            const obj = response.data as Record<string, unknown>;
            if (obj.cart) cart = obj.cart;
        }

        return { cart, raw: response.data };
    }

    /**
     * Add item to cart - POST /carts/{id}/items
     * Can use product_id, sku, or variation_id
     */
    async addToCart(
        cartId: string,
        item: { product_id?: number | string; sku?: string; variation_id?: number; quantity: number }
    ): Promise<{ cart: unknown; raw: unknown }> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}/items`;

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'POST',
            body: JSON.stringify(item),
        });

        if (response.error) {
            throw new Error(`Add to cart failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Add to cart failed with status ${response.status}: ${response.statusText}`);
        }

        let cart: unknown = response.data;
        if (response.data && typeof response.data === 'object') {
            const obj = response.data as Record<string, unknown>;
            if (obj.cart) cart = obj.cart;
        }

        return { cart, raw: response.data };
    }

    /**
     * Update cart item quantity - PATCH /carts/{id}/items/{item_key}
     */
    async updateCartItem(
        cartId: string,
        itemKey: string,
        quantity: number
    ): Promise<{ cart: unknown; raw: unknown }> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}/items/${itemKey}`;

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
        });

        if (response.error) {
            throw new Error(`Update cart item failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Update cart item failed with status ${response.status}: ${response.statusText}`);
        }

        let cart: unknown = response.data;
        if (response.data && typeof response.data === 'object') {
            const obj = response.data as Record<string, unknown>;
            if (obj.cart) cart = obj.cart;
        }

        return { cart, raw: response.data };
    }

    /**
     * Remove item from cart - DELETE /carts/{id}/items/{item_key}
     */
    async removeCartItem(
        cartId: string,
        itemKey: string
    ): Promise<{ cart: unknown; raw: unknown }> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}/items/${itemKey}`;

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'DELETE',
        });

        if (response.error) {
            throw new Error(`Remove cart item failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Remove cart item failed with status ${response.status}: ${response.statusText}`);
        }

        let cart: unknown = response.data;
        if (response.data && typeof response.data === 'object') {
            const obj = response.data as Record<string, unknown>;
            if (obj.cart) cart = obj.cart;
        }

        return { cart, raw: response.data };
    }

    /**
     * Convert cart to checkout - POST /carts/{id}/checkout
     */
    async convertCartToCheckout(
        cartId: string,
        addresses?: {
            shipping_address?: Record<string, string>;
            billing_address?: Record<string, string>;
        }
    ): Promise<{ checkout: unknown; raw: unknown }> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}/checkout`;

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'POST',
            body: JSON.stringify(addresses || {}),
        });

        if (response.error) {
            throw new Error(`Convert cart to checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Convert cart to checkout failed with status ${response.status}: ${response.statusText}`);
        }

        return { checkout: response.data, raw: response.data };
    }

    /**
     * Delete cart - DELETE /carts/{id}
     */
    async deleteCart(cartId: string): Promise<void> {
        const endpoint = `${this.getCartEndpoint()}/${cartId}`;

        const response = await this.proxyFetch<unknown>(endpoint, {
            method: 'DELETE',
        });

        if (response.error) {
            throw new Error(`Delete cart failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Delete cart failed with status ${response.status}: ${response.statusText}`);
        }
    }

    // ============================================================================
    // Checkout Operations
    // ============================================================================

    async createCheckout(
        request: CreateCheckoutRequest
    ): Promise<{ session: CheckoutSession; validation: ValidationResult<unknown>; raw: unknown }> {
        const url = `${this.baseUrl}/checkout-sessions`;

        const response = await this.proxyFetch<CheckoutSession>(url, {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (response.error) {
            throw new Error(`Create checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Create checkout failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML (server returned a page instead of API response)
        if (typeof response.data === 'string') {
            const dataStr = response.data as string;
            if (dataStr.includes('<!DOCTYPE') || dataStr.includes('<html')) {
                throw new Error('Server returned HTML page instead of JSON. The checkout endpoint may not be properly configured or requires browser-based checkout.');
            }
        }

        // Check if response has valid session data
        const data = response.data as unknown as Record<string, unknown>;
        if (!data || !data.id) {
            console.warn('[UCP] Checkout response missing session id:', response.data);
        }

        const validation = validateCheckoutSession(response.data);

        return {
            session: response.data,
            validation,
            raw: response.data,
        };
    }

    /**
     * Get checkout session endpoint (UCP Shopping Agent uses /wp-json/ucp/v1/checkout/sessions)
     */
    getCheckoutSessionEndpoint(): string {
        return `${this.baseUrl}/wp-json/ucp/v1/checkout/sessions`;
    }

    async getCheckout(
        id: string
    ): Promise<{ session: CheckoutSession; validation: ValidationResult<unknown>; raw: unknown }> {
        // Try the UCP Shopping Agent endpoint first
        const url = `${this.getCheckoutSessionEndpoint()}/${encodeURIComponent(id)}`;

        const response = await this.proxyFetch<CheckoutSession>(url, {
            method: 'GET',
        });

        if (response.error) {
            throw new Error(`Get checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Get checkout failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML (server returned a page instead of API response)
        if (typeof response.data === 'string') {
            const dataStr = response.data as string;
            if (dataStr.includes('<!DOCTYPE') || dataStr.includes('<html')) {
                throw new Error('Get checkout returned HTML. The /checkout-sessions endpoint may not exist on this server.');
            }
        }

        const validation = validateCheckoutSession(response.data);

        return {
            session: response.data,
            validation,
            raw: response.data,
        };
    }

    async updateCheckout(
        id: string,
        request: UpdateCheckoutRequest
    ): Promise<{ session: CheckoutSession; validation: ValidationResult<unknown>; raw: unknown }> {
        const url = `${this.getCheckoutSessionEndpoint()}/${encodeURIComponent(id)}`;

        const response = await this.proxyFetch<CheckoutSession>(url, {
            method: 'PATCH',
            body: JSON.stringify(request),
        });

        if (response.error) {
            throw new Error(`Update checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Update checkout failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML
        const updateData = response.data as unknown;
        if (typeof updateData === 'string' && (updateData.includes('<!DOCTYPE') || updateData.includes('<html'))) {
            throw new Error('Update checkout returned HTML. The endpoint may not be implemented.');
        }

        const validation = validateCheckoutSession(response.data);

        return {
            session: response.data,
            validation,
            raw: response.data,
        };
    }

    async completeCheckout(
        id: string,
        request: CompleteCheckoutRequest
    ): Promise<{ session: CheckoutSession; validation: ValidationResult<unknown>; raw: unknown }> {
        const url = `${this.getCheckoutSessionEndpoint()}/${encodeURIComponent(id)}/complete`;

        const response = await this.proxyFetch<CheckoutSession>(url, {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (response.error) {
            throw new Error(`Complete checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Complete checkout failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML
        const completeData = response.data as unknown;
        if (typeof completeData === 'string' && (completeData.includes('<!DOCTYPE') || completeData.includes('<html'))) {
            throw new Error('Complete checkout returned HTML. The endpoint may not be implemented.');
        }

        const validation = validateCheckoutSession(response.data);

        return {
            session: response.data,
            validation,
            raw: response.data,
        };
    }

    async cancelCheckout(
        id: string
    ): Promise<{ session: CheckoutSession; validation: ValidationResult<unknown>; raw: unknown }> {
        const url = `${this.getCheckoutSessionEndpoint()}/${encodeURIComponent(id)}/cancel`;

        const response = await this.proxyFetch<CheckoutSession>(url, {
            method: 'POST',
            body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
        });

        if (response.error) {
            throw new Error(`Cancel checkout failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Cancel checkout failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML
        const cancelData = response.data as unknown;
        if (typeof cancelData === 'string' && (cancelData.includes('<!DOCTYPE') || cancelData.includes('<html'))) {
            throw new Error('Cancel checkout returned HTML. The endpoint may not be implemented.');
        }

        const validation = validateCheckoutSession(response.data);

        return {
            session: response.data,
            validation,
            raw: response.data,
        };
    }

    // ============================================================================
    // Order Operations
    // ============================================================================

    /**
     * Get orders endpoint (UCP Shopping Agent uses /wp-json/ucp/v1/orders)
     */
    getOrderEndpoint(): string {
        return `${this.baseUrl}/wp-json/ucp/v1/orders`;
    }

    /**
     * Get order by ID - GET /orders/{id}
     */
    async getOrder(
        orderId: string
    ): Promise<{ order: unknown; raw: unknown }> {
        const url = `${this.getOrderEndpoint()}/${encodeURIComponent(orderId)}`;

        const response = await this.proxyFetch<unknown>(url, {
            method: 'GET',
        });

        if (response.error) {
            throw new Error(`Get order failed: ${response.error}`);
        }

        if (response.status >= 400) {
            throw new Error(`Get order failed with status ${response.status}: ${response.statusText}`);
        }

        // Check if response is HTML
        const orderData = response.data as unknown;
        if (typeof orderData === 'string' && (orderData.includes('<!DOCTYPE') || orderData.includes('<html'))) {
            throw new Error('Get order returned HTML. The endpoint may not be implemented.');
        }

        return {
            order: response.data,
            raw: response.data,
        };
    }

    // ============================================================================
    // Internal
    // ============================================================================

    private async proxyFetch<T>(
        targetUrl: string,
        options: RequestInit
    ): Promise<ProxyResponse<T>> {
        const proxyUrlWithTarget = `${this.proxyUrl}?url=${encodeURIComponent(targetUrl)}`;

        const headers = new Headers(options.headers);
        headers.set('Content-Type', 'application/json');
        headers.set('UCP-Agent', `profile="${this.platformProfile}"`);

        // Add API key authorization if configured (UCP uses X-UCP-API-Key header)
        if (this.apiKey) {
            headers.set('X-UCP-API-Key', this.apiKey);
        }

        const response = await fetch(proxyUrlWithTarget, {
            ...options,
            headers,
        });

        const result = await response.json();

        return result as ProxyResponse<T>;
    }

    // Update base URL
    setBaseUrl(url: string): void {
        this.baseUrl = this.normalizeUrl(url);
    }

    // Get current base URL
    getBaseUrl(): string {
        return this.baseUrl;
    }

    // Set API key
    setApiKey(key: string): void {
        this.apiKey = key;
    }

    // Get API key
    getApiKey(): string {
        return this.apiKey;
    }
}

// Singleton instance
let clientInstance: UCPClient | null = null;

export function getUCPClient(baseUrl?: string): UCPClient {
    if (!clientInstance || (baseUrl && clientInstance.getBaseUrl() !== baseUrl)) {
        clientInstance = new UCPClient({
            baseUrl: baseUrl || 'http://localhost:8080'
        });
    }
    return clientInstance;
}
