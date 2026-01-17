// UCP Zod Schemas - Strict validation for UCP payloads
import { z } from 'zod';

// ============================================================================
// Core Protocol Schemas
// ============================================================================

export const ucpCapabilitySchema = z.object({
    name: z.string(),
    version: z.string(),
    spec: z.string().optional(),
    schema: z.string().optional(),
    extends: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
});

export const ucpWrapperSchema = z.object({
    version: z.string(),
    capabilities: z.array(ucpCapabilitySchema).optional(),
});

export const ucpServiceSchema = z.object({
    version: z.string(),
    spec: z.string(),
    rest: z.object({
        schema: z.string(),
        endpoint: z.string(),
    }).optional(),
    mcp: z.object({
        schema: z.string(),
        endpoint: z.string(),
    }).optional(),
    a2a: z.object({
        endpoint: z.string(),
    }).optional(),
    embedded: z.object({
        schema: z.string(),
    }).optional(),
});

export const paymentHandlerSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    spec: z.string(),
    config_schema: z.string().optional(),
    instrument_schemas: z.array(z.string()).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
});

export const jwkSchema = z.object({
    kid: z.string(),
    kty: z.string(),
    crv: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    use: z.string().optional(),
    alg: z.string().optional(),
});

export const ucpProfileSchema = z.object({
    ucp: z.object({
        version: z.string(),
        services: z.record(z.string(), ucpServiceSchema).optional(),
        capabilities: z.array(ucpCapabilitySchema),
    }),
    payment: z.object({
        handlers: z.array(paymentHandlerSchema),
    }).optional(),
    signing_keys: z.array(jwkSchema).optional(),
});

// ============================================================================
// Checkout Schemas
// ============================================================================

export const checkoutStatusSchema = z.enum([
    'incomplete',
    'ready_for_complete',
    'processing',
    'completed',
    'canceled',
    'requires_escalation',
    'error',
]);

export const buyerSchema = z.object({
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
});

export const itemSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().int().optional(),
    image_url: z.string().url().optional(),
    url: z.string().url().optional(),
});

export const totalTypeSchema = z.enum([
    'subtotal',
    'tax',
    'fulfillment',
    'discount',
    'total',
]);

export const totalSchema = z.object({
    type: totalTypeSchema,
    amount: z.number().int(),
    display_text: z.string().optional(),
});

export const lineItemSchema = z.object({
    id: z.string(),
    item: itemSchema,
    quantity: z.number().int().positive(),
    totals: z.array(totalSchema).optional(),
});

export const messageSchema = z.object({
    type: z.enum(['error', 'warning', 'info']),
    code: z.string(),
    path: z.string().optional(),
    content: z.string(),
    severity: z.enum(['recoverable', 'requires_buyer_input', 'fatal']).optional(),
});

export const linkSchema = z.object({
    type: z.enum(['terms_of_service', 'privacy_policy', 'return_policy', 'other']),
    url: z.string().url(),
    title: z.string().optional(),
});

// ============================================================================
// Fulfillment Schemas
// ============================================================================

export const destinationSchema = z.object({
    id: z.string().optional(),
    full_name: z.string().optional(),
    street_address: z.string().optional(),
    extended_address: z.string().optional(),
    address_locality: z.string().optional(),
    address_region: z.string().optional(),
    postal_code: z.string().optional(),
    address_country: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
});

export const fulfillmentOptionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    totals: z.array(totalSchema).optional(),
});

export const fulfillmentGroupSchema = z.object({
    id: z.string(),
    line_item_ids: z.array(z.string()).optional(),
    selected_option_id: z.string().optional(),
    options: z.array(fulfillmentOptionSchema).optional(),
});

export const fulfillmentMethodSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['shipping', 'pickup', 'digital']),
    line_item_ids: z.array(z.string()).optional(),
    selected_destination_id: z.string().optional(),
    destinations: z.array(destinationSchema).optional(),
    groups: z.array(fulfillmentGroupSchema).optional(),
});

export const fulfillmentSchema = z.object({
    methods: z.array(fulfillmentMethodSchema),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const paymentCredentialSchema = z.object({
    type: z.string(),
    token: z.string(),
});

export const paymentInstrumentSchema = z.object({
    id: z.string(),
    handler_id: z.string(),
    type: z.string(),
    brand: z.string().optional(),
    last_digits: z.string().optional(),
    rich_text_description: z.string().optional(),
    rich_card_art: z.string().optional(),
    billing_address: destinationSchema.optional(),
    credential: paymentCredentialSchema.optional(),
});

export const paymentSchema = z.object({
    handlers: z.array(paymentHandlerSchema).optional(),
    selected_instrument_id: z.string().optional(),
    instruments: z.array(paymentInstrumentSchema).optional(),
});

export const paymentDataSchema = z.object({
    id: z.string().optional(),
    handler_id: z.string(),
    type: z.string().optional(),
    brand: z.string().optional(),
    last_digits: z.string().optional(),
    billing_address: destinationSchema.optional(),
    credential: paymentCredentialSchema.optional(),
    rich_text_description: z.string().optional(),
    rich_card_art: z.string().optional(),
});

// ============================================================================
// Order Schemas
// ============================================================================

export const orderLineItemSchema = z.object({
    id: z.string(),
    quantity: z.number().int(),
});

export const fulfillmentExpectationSchema = z.object({
    id: z.string(),
    line_items: z.array(orderLineItemSchema),
    method_type: z.enum(['shipping', 'pickup', 'digital']),
    destination: destinationSchema.optional(),
    description: z.string().optional(),
    fulfillable_on: z.string().optional(),
});

export const fulfillmentEventSchema = z.object({
    id: z.string(),
    occurred_at: z.string(),
    type: z.enum(['shipped', 'delivered', 'returned', 'canceled']),
    line_items: z.array(orderLineItemSchema),
    tracking_number: z.string().optional(),
    tracking_url: z.string().url().optional(),
    description: z.string().optional(),
});

export const orderAdjustmentSchema = z.object({
    id: z.string(),
    type: z.enum(['refund', 'charge', 'credit']),
    occurred_at: z.string(),
    status: z.enum(['pending', 'completed', 'failed']),
    line_items: z.array(orderLineItemSchema).optional(),
    amount: z.number().int(),
    description: z.string().optional(),
});

export const orderFulfillmentSchema = z.object({
    expectations: z.array(fulfillmentExpectationSchema).optional(),
    events: z.array(fulfillmentEventSchema).optional(),
});

export const orderSchema = z.object({
    ucp: ucpWrapperSchema.optional(),
    id: z.string(),
    checkout_id: z.string(),
    permalink_url: z.string().url().optional(),
    line_items: z.array(orderLineItemSchema),
    fulfillment: orderFulfillmentSchema.optional(),
    adjustments: z.array(orderAdjustmentSchema).optional(),
    totals: z.array(totalSchema).optional(),
});

// ============================================================================
// Checkout Session Schema
// ============================================================================

export const checkoutSessionSchema = z.object({
    ucp: ucpWrapperSchema.optional(),
    id: z.string(),
    status: checkoutStatusSchema,
    currency: z.string().optional(),
    buyer: buyerSchema.optional(),
    line_items: z.array(lineItemSchema),
    totals: z.array(totalSchema).optional(),
    fulfillment: fulfillmentSchema.optional(),
    payment: paymentSchema.optional(),
    messages: z.array(messageSchema).optional(),
    links: z.array(linkSchema).optional(),
    order: orderSchema.partial().optional(),
    continue_url: z.string().url().optional(),
    expires_at: z.string().optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const createCheckoutRequestSchema = z.object({
    line_items: z.array(lineItemSchema),
    buyer: buyerSchema.optional(),
    currency: z.string().optional(),
    fulfillment: fulfillmentSchema.optional(),
    payment: paymentSchema.partial().optional(),
    idempotency_key: z.string().uuid().optional(),
});

export const updateCheckoutRequestSchema = z.object({
    id: z.string(),
    line_items: z.array(lineItemSchema).optional(),
    buyer: buyerSchema.optional(),
    fulfillment: fulfillmentSchema.optional(),
    payment: paymentSchema.partial().optional(),
});

export const completeCheckoutRequestSchema = z.object({
    payment_data: paymentDataSchema.optional(),
    risk_signals: z.record(z.string(), z.unknown()).optional(),
    idempotency_key: z.string().uuid().optional(),
});

// ============================================================================
// Validation Helpers
// ============================================================================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Array<{
        path: string;
        message: string;
    }>;
}

export function validatePayload<T>(
    schema: z.ZodSchema<T>,
    payload: unknown
): ValidationResult<T> {
    const result = schema.safeParse(payload);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return {
        success: false,
        errors: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        })),
    };
}

export function validateCheckoutSession(payload: unknown) {
    return validatePayload(checkoutSessionSchema, payload);
}

export function validateUCPProfile(payload: unknown) {
    return validatePayload(ucpProfileSchema, payload);
}

export function validateCreateCheckout(payload: unknown) {
    return validatePayload(createCheckoutRequestSchema, payload);
}

export function validateUpdateCheckout(payload: unknown) {
    return validatePayload(updateCheckoutRequestSchema, payload);
}

export function validateCompleteCheckout(payload: unknown) {
    return validatePayload(completeCheckoutRequestSchema, payload);
}

// Type exports from schemas
export type UCPCapability = z.infer<typeof ucpCapabilitySchema>;
export type UCPWrapper = z.infer<typeof ucpWrapperSchema>;
export type UCPProfile = z.infer<typeof ucpProfileSchema>;
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;
export type Buyer = z.infer<typeof buyerSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Total = z.infer<typeof totalSchema>;
export type Fulfillment = z.infer<typeof fulfillmentSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentData = z.infer<typeof paymentDataSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Message = z.infer<typeof messageSchema>;
