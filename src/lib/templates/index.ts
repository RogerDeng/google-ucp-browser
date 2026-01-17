// Reference Templates for UCP Actions
import type { UCPAction } from '$lib/types/ucp';

export interface ReferenceTemplate {
    title: string;
    description: string;
    docUrl?: string;
    example: unknown;
}

export const referenceTemplates: Record<UCPAction, ReferenceTemplate> = {
    discover: {
        title: 'Discovery Request',
        description: 'Fetch the business UCP profile from /.well-known/ucp to discover supported capabilities and endpoints.',
        docUrl: 'https://ucp.dev/specification/overview',
        example: {
            method: 'GET',
            url: '/.well-known/ucp',
            headers: {
                'Accept': 'application/json'
            }
        }
    },

    create_checkout: {
        title: 'Create Checkout Session',
        description: 'Create a new checkout session with line items. The business will return available fulfillment options and payment handlers.',
        docUrl: 'https://ucp.dev/specification/checkout-rest',
        example: {
            method: 'POST',
            url: '/wp-json/ucp/v1/checkout/sessions',
            headers: {
                'Content-Type': 'application/json',
                'UCP-Agent': 'profile="https://platform.example/profile"'
            },
            body: {
                line_items: [
                    {
                        id: 'li_1',
                        item: {
                            id: 'item_123',
                            title: 'Example Product',
                            price: 2500
                        },
                        quantity: 1
                    }
                ],
                buyer: {
                    email: 'buyer@example.com',
                    first_name: 'John',
                    last_name: 'Doe'
                }
            }
        }
    },

    get_checkout: {
        title: 'Get Checkout Session',
        description: 'Retrieve the current state of a checkout session by ID.',
        docUrl: 'https://ucp.dev/specification/checkout-rest',
        example: {
            method: 'GET',
            url: '/wp-json/ucp/v1/checkout/sessions/{id}',
            headers: {
                'Accept': 'application/json',
                'UCP-Agent': 'profile="https://platform.example/profile"'
            }
        }
    },

    update_checkout: {
        title: 'Update Checkout Session',
        description: 'Update checkout session with buyer info, fulfillment selection, or other changes. Each PUT replaces the entire session.',
        docUrl: 'https://ucp.dev/specification/checkout-rest',
        example: {
            method: 'PATCH',
            url: '/wp-json/ucp/v1/checkout/sessions/{id}',
            headers: {
                'Content-Type': 'application/json',
                'UCP-Agent': 'profile="https://platform.example/profile"'
            },
            body: {
                id: 'chk_123456789',
                buyer: {
                    email: 'buyer@example.com',
                    first_name: 'John',
                    last_name: 'Doe'
                },
                line_items: [
                    {
                        id: 'li_1',
                        item: {
                            id: 'item_123',
                            title: 'Example Product',
                            price: 2500
                        },
                        quantity: 1
                    }
                ],
                fulfillment: {
                    methods: [
                        {
                            id: 'shipping_1',
                            type: 'shipping',
                            selected_destination_id: 'dest_1',
                            destinations: [
                                {
                                    id: 'dest_1',
                                    street_address: '123 Main St',
                                    address_locality: 'Springfield',
                                    address_region: 'IL',
                                    postal_code: '62701',
                                    address_country: 'US'
                                }
                            ],
                            groups: [
                                {
                                    id: 'group_1',
                                    selected_option_id: 'standard'
                                }
                            ]
                        }
                    ]
                }
            }
        }
    },

    complete_checkout: {
        title: 'Complete Checkout',
        description: 'Finalize the order with payment data. The business will process payment and create the order.',
        docUrl: 'https://ucp.dev/specification/checkout-rest',
        example: {
            method: 'POST',
            url: '/wp-json/ucp/v1/checkout/sessions/{id}/complete',
            headers: {
                'Content-Type': 'application/json',
                'UCP-Agent': 'profile="https://platform.example/profile"'
            },
            body: {
                payment_data: {
                    id: 'pi_123',
                    handler_id: 'com.google.pay',
                    type: 'card',
                    brand: 'visa',
                    last_digits: '4242',
                    billing_address: {
                        street_address: '123 Main St',
                        address_locality: 'Springfield',
                        address_region: 'IL',
                        postal_code: '62701',
                        address_country: 'US'
                    },
                    credential: {
                        type: 'PAYMENT_GATEWAY',
                        token: 'tok_xxx'
                    }
                },
                risk_signals: {}
            }
        }
    },

    cancel_checkout: {
        title: 'Cancel Checkout',
        description: 'Cancel an active checkout session.',
        docUrl: 'https://ucp.dev/specification/checkout-rest',
        example: {
            method: 'POST',
            url: '/wp-json/ucp/v1/checkout/sessions/{id}/cancel',
            headers: {
                'Content-Type': 'application/json',
                'UCP-Agent': 'profile="https://platform.example/profile"'
            },
            body: {
                idempotency_key: '550e8400-e29b-41d4-a716-446655440000'
            }
        }
    },

    webhook: {
        title: 'Webhook Callback',
        description: 'Incoming webhook notification from the UCP server for async events like order updates.',
        docUrl: 'https://ucp.dev/specification/order',
        example: {
            type: 'order.updated',
            context: {
                transaction_id: 'txn_123',
                message_id: 'msg_456',
                action: 'on_order_update'
            },
            data: {
                order: {
                    id: 'order_123',
                    status: 'shipped',
                    fulfillment: {
                        events: [
                            {
                                id: 'evt_1',
                                type: 'shipped',
                                occurred_at: '2026-01-16T10:00:00Z',
                                tracking_number: '1Z999AA10123456784',
                                tracking_url: 'https://ups.com/track/1Z999AA10123456784'
                            }
                        ]
                    }
                }
            }
        }
    },

    create_cart: {
        title: 'Create Cart',
        description: 'Create a new shopping cart. Returns cart ID that can be used to add items.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'POST',
            url: '/carts',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: {}
        }
    },

    add_to_cart: {
        title: 'Add Item to Cart',
        description: 'Add a product to an existing cart with specified quantity.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'POST',
            url: '/carts/{cart_id}/items',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: {
                product_id: 'prod_123',
                quantity: 1
            }
        }
    },

    get_cart: {
        title: 'Get Cart',
        description: 'Retrieve the current state of a shopping cart by ID.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/carts/{cart_id}',
            headers: {
                'Accept': 'application/json'
            }
        }
    },

    get_products: {
        title: 'Get Products',
        description: 'Retrieve a list of available products from the UCP server.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/products',
            headers: {
                'Accept': 'application/json'
            },
            query: {
                per_page: 10,
                page: 1
            }
        }
    },

    get_product: {
        title: 'Get Product Details',
        description: 'Retrieve detailed information about a specific product by ID.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/products/{product_id}',
            headers: {
                'Accept': 'application/json'
            }
        }
    },

    get_order: {
        title: 'Get Order Details',
        description: 'Retrieve order details by ID after checkout completion.',
        docUrl: 'https://ucp.dev/specification/orders',
        example: {
            method: 'GET',
            url: '/orders/{order_id}',
            headers: {
                'Accept': 'application/json',
                'X-UCP-API-Key': 'your_api_key'
            }
        }
    },

    get_categories: {
        title: 'Get Categories',
        description: 'Retrieve product categories from the UCP server.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/wp-json/ucp/v1/categories',
            headers: {
                'Accept': 'application/json'
            }
        }
    },

    search_products: {
        title: 'Search Products',
        description: 'Search products by keyword with optional filters.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/wp-json/ucp/v1/products/search?q={keyword}',
            headers: {
                'Accept': 'application/json'
            },
            query: {
                q: 'search keyword',
                page: 1,
                per_page: 10,
                category: 'optional category ID'
            }
        }
    },

    get_category_products: {
        title: 'Get Category Products',
        description: 'Get products by category ID with optional subcategory inclusion.',
        docUrl: 'https://ucp.dev/specification/shopping',
        example: {
            method: 'GET',
            url: '/wp-json/ucp/v1/categories/{category_id}/products',
            headers: {
                'Accept': 'application/json'
            },
            query: {
                include_subcategories: true,
                page: 1,
                per_page: 10
            }
        }
    }
};
