// UCP Types - Based on Universal Commerce Protocol Specification v2026-01-11

// ============================================================================
// Core Protocol Types
// ============================================================================

export interface UCPWrapper {
    version: string;
    capabilities?: UCPCapability[];
}

export interface UCPCapability {
    name: string;
    version: string;
    spec?: string;
    schema?: string;
    extends?: string;
    config?: Record<string, unknown>;
}

export interface UCPService {
    version: string;
    spec: string;
    rest?: {
        schema: string;
        endpoint: string;
    };
    mcp?: {
        schema: string;
        endpoint: string;
    };
    a2a?: {
        endpoint: string;
    };
    embedded?: {
        schema: string;
    };
}

export interface UCPProfile {
    ucp: {
        version: string;
        services?: Record<string, UCPService>;
        capabilities: UCPCapability[];
    };
    payment?: {
        handlers: PaymentHandler[];
    };
    signing_keys?: JWK[];
}

export interface JWK {
    kid: string;
    kty: string;
    crv?: string;
    x?: string;
    y?: string;
    use?: string;
    alg?: string;
}

// ============================================================================
// Checkout Types
// ============================================================================

export type CheckoutStatus =
    | 'incomplete'
    | 'ready_for_complete'
    | 'processing'
    | 'completed'
    | 'canceled'
    | 'requires_escalation'
    | 'error';

export interface CheckoutSession {
    ucp?: UCPWrapper;
    id: string;
    status: CheckoutStatus;
    currency?: string;
    buyer?: Buyer;
    line_items: LineItem[];
    totals?: Total[];
    fulfillment?: Fulfillment;
    payment?: Payment;
    messages?: Message[];
    links?: Link[];
    order?: Partial<Order>;
    continue_url?: string;
    expires_at?: string;
}

export interface Buyer {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export interface LineItem {
    id: string;
    item: Item;
    quantity: number;
    totals?: Total[];
}

export interface Item {
    id: string;
    title?: string;
    description?: string;
    price?: number;
    image_url?: string;
    url?: string;
}

export interface Total {
    type: TotalType;
    amount: number;
    display_text?: string;
}

export type TotalType =
    | 'subtotal'
    | 'tax'
    | 'fulfillment'
    | 'discount'
    | 'total';

export interface Message {
    type: 'error' | 'warning' | 'info';
    code: string;
    path?: string;
    content: string;
    severity?: 'recoverable' | 'requires_buyer_input' | 'fatal';
}

export interface Link {
    type: 'terms_of_service' | 'privacy_policy' | 'return_policy' | 'other';
    url: string;
    title?: string;
}

// ============================================================================
// Fulfillment Types
// ============================================================================

export interface Fulfillment {
    methods: FulfillmentMethod[];
}

export interface FulfillmentMethod {
    id?: string;
    type: 'shipping' | 'pickup' | 'digital';
    line_item_ids?: string[];
    selected_destination_id?: string;
    destinations?: Destination[];
    groups?: FulfillmentGroup[];
}

export interface Destination {
    id?: string;
    full_name?: string;
    street_address?: string;
    extended_address?: string;
    address_locality?: string;
    address_region?: string;
    postal_code?: string;
    address_country?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
}

export interface FulfillmentGroup {
    id: string;
    line_item_ids?: string[];
    selected_option_id?: string;
    options?: FulfillmentOption[];
}

export interface FulfillmentOption {
    id: string;
    title: string;
    description?: string;
    totals?: Total[];
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
    handlers?: PaymentHandler[];
    selected_instrument_id?: string;
    instruments?: PaymentInstrument[];
}

export interface PaymentHandler {
    id: string;
    name: string;
    version: string;
    spec: string;
    config_schema?: string;
    instrument_schemas?: string[];
    config?: Record<string, unknown>;
}

export interface PaymentInstrument {
    id: string;
    handler_id: string;
    type: string;
    brand?: string;
    last_digits?: string;
    rich_text_description?: string;
    rich_card_art?: string;
    billing_address?: Destination;
    credential?: PaymentCredential;
}

export interface PaymentCredential {
    type: string;
    token: string;
}

export interface PaymentData {
    id?: string;
    handler_id: string;
    type?: string;
    brand?: string;
    last_digits?: string;
    billing_address?: Destination;
    credential?: PaymentCredential;
    rich_text_description?: string;
    rich_card_art?: string;
}

// ============================================================================
// Order Types
// ============================================================================

export interface Order {
    ucp?: UCPWrapper;
    id: string;
    checkout_id: string;
    permalink_url?: string;
    line_items: OrderLineItem[];
    fulfillment?: OrderFulfillment;
    adjustments?: OrderAdjustment[];
    totals?: Total[];
}

export interface OrderLineItem {
    id: string;
    quantity: number;
}

export interface OrderFulfillment {
    expectations?: FulfillmentExpectation[];
    events?: FulfillmentEvent[];
}

export interface FulfillmentExpectation {
    id: string;
    line_items: OrderLineItem[];
    method_type: 'shipping' | 'pickup' | 'digital';
    destination?: Destination;
    description?: string;
    fulfillable_on?: string;
}

export interface FulfillmentEvent {
    id: string;
    occurred_at: string;
    type: 'shipped' | 'delivered' | 'returned' | 'canceled';
    line_items: OrderLineItem[];
    tracking_number?: string;
    tracking_url?: string;
    description?: string;
}

export interface OrderAdjustment {
    id: string;
    type: 'refund' | 'charge' | 'credit';
    occurred_at: string;
    status: 'pending' | 'completed' | 'failed';
    line_items?: OrderLineItem[];
    amount: number;
    description?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateCheckoutRequest {
    line_items: LineItem[];
    buyer?: Buyer;
    currency?: string;
    fulfillment?: Fulfillment;
    payment?: Partial<Payment>;
    idempotency_key?: string;
}

export interface UpdateCheckoutRequest {
    id: string;
    line_items?: LineItem[];
    buyer?: Buyer;
    fulfillment?: Fulfillment;
    payment?: Partial<Payment>;
}

export interface CompleteCheckoutRequest {
    payment_data?: PaymentData;
    risk_signals?: Record<string, unknown>;
    idempotency_key?: string;
}

// ============================================================================
// Message Correlation Types (for Debugger)
// ============================================================================

export type UCPAction =
    | 'discover'
    | 'create_checkout'
    | 'get_checkout'
    | 'update_checkout'
    | 'complete_checkout'
    | 'cancel_checkout'
    | 'create_cart'
    | 'add_to_cart'
    | 'get_cart'
    | 'get_products'
    | 'get_product'
    | 'get_categories'
    | 'get_category_products'
    | 'search_products'
    | 'get_order'
    | 'webhook';

/**
 * HTTP protocol details for a message
 */
export interface HTTPDetails {
    method?: string;
    url?: string;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
}

export interface CorrelatedMessage {
    id: string;
    transactionId: string;
    messageId: string;
    type: 'request' | 'response' | 'webhook';
    action: UCPAction;
    payload: unknown;
    parentId?: string;
    isOrphan?: boolean;
    timestamp: Date;
    duration?: number; // ms for request-response pairs
    status?: 'pending' | 'completed' | 'failed';
    errors?: Message[];
    http?: HTTPDetails; // HTTP protocol details
}

export interface Transaction {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    messages: CorrelatedMessage[];
    serverUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Tunnel Types
// ============================================================================

export interface TunnelConfig {
    authtoken: string;
    port: number;
}

export interface TunnelStatus {
    connected: boolean;
    publicUrl?: string;
    localPort?: number;
    error?: string;
}

// ============================================================================
// Lifecycle Visualizer Types
// ============================================================================

export type LifecycleStage =
    | 'discover'
    | 'create'
    | 'update'
    | 'complete'
    | 'order';

export type StageStatus = 'idle' | 'pending' | 'completed' | 'failed';

export interface LifecycleNode {
    stage: LifecycleStage;
    label: string;
    status: StageStatus;
    messageIds: string[];
}
