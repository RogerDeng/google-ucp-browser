<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Activity, 
    GitBranch, 
    Server, 
    Wifi, 
    WifiOff,
    Send,
    RefreshCw,
    Trash2,
    Settings,
    ChevronRight,
    BookOpen,
    PanelRightClose,
    ShoppingCart as CartIcon
  } from 'lucide-svelte';
  
  import Header from '$lib/components/Header.svelte';
  import TransactionTree from '$lib/components/TransactionTree.svelte';
  import JsonViewer from '$lib/components/JsonViewer.svelte';
  import ReferencePanel from '$lib/components/ReferencePanel.svelte';
  import LifecycleVisualizer from '$lib/components/LifecycleVisualizer.svelte';
  import TunnelManager from '$lib/components/TunnelManager.svelte';
  import ProductsPanel from '$lib/components/ProductsPanel.svelte';
  import ProductDetail from '$lib/components/ProductDetail.svelte';
  import CheckoutAddressModal from '$lib/components/CheckoutAddressModal.svelte';
  
  import { settings, showLifecycleVisualizer, showTransactionTree, leftPanelWidth } from '$lib/stores/settings';
  import { tunnelStatus } from '$lib/stores/tunnel';
  import { 
    transactions, 
    transactionList, 
    selectedTransaction, 
    selectedMessage,
    selectedTransactionId,
    selectedMessageId,
    lifecycleFilter
  } from '$lib/stores/transactions';
  import { cart, cartItemCount } from '$lib/stores/cart';
  import { getUCPClient } from '$lib/services/ucp-client';
  import type { UCPAction } from '$lib/types/ucp';

  // ============================================================================
  // State
  // ============================================================================
  
  let serverUrl = $state('');
  let apiKey = $state('');
  let isDiscovering = $state(false);
  let discoveryError = $state<string | null>(null);
  let showTunnelPanel = $state(false);
  let showSettingsPanel = $state(false);
  let sseConnected = $state(false);
  let eventSource: EventSource | null = null;

  // Products state
  let products = $state<unknown[]>([]);
  let isLoadingProducts = $state(false);
  let productsError = $state<string | null>(null);
  let discoveredProfile = $state<unknown>(null);
  let productsBaseEndpoint = $state<string | null>(null);

  // Product detail state
  let selectedProductDetail = $state<unknown>(null);
  let isLoadingProductDetail = $state(false);
  let showProductDetail = $state(false);

  // Cart state
  let currentCartId = $state<string | null>(null);
  let isAddingToCart = $state(false);
  let showCheckoutModal = $state(false);
  let currentCheckoutId = $state<string | null>(null);
  let currentOrderId = $state<string | null>(null);

  // UI panel visibility
  let showReferencePanel = $state(false); // Default to hidden

  // Error toast state
  let errorToast = $state<string | null>(null);
  let errorToastTimeout: ReturnType<typeof setTimeout> | null = null;

  function showError(message: string) {
    errorToast = message;
    if (errorToastTimeout) clearTimeout(errorToastTimeout);
    errorToastTimeout = setTimeout(() => {
      errorToast = null;
    }, 8000);
  }

  // Divider drag state
  let isDragging = $state(false);
  let currentLeftWidth = $state(50);

  // Initialize from store
  onMount(() => {
    const unsubscribe = settings.subscribe(s => {
      serverUrl = s.serverUrl;
      apiKey = s.apiKey;
      currentLeftWidth = s.leftPanelWidth;
    });

    // Connect to SSE for webhook notifications
    connectSSE();

    return () => {
      unsubscribe();
      if (eventSource) {
        eventSource.close();
      }
    };
  });

  // ============================================================================
  // SSE Connection
  // ============================================================================

  function connectSSE() {
    eventSource = new EventSource('/api/events');
    
    eventSource.onopen = () => {
      sseConnected = true;
      console.log('[SSE] Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSSEMessage(data);
      } catch (e) {
        console.error('[SSE] Parse error:', e);
      }
    };

    eventSource.onerror = () => {
      sseConnected = false;
      console.log('[SSE] Disconnected, reconnecting...');
      setTimeout(connectSSE, 3000);
    };
  }

  function handleSSEMessage(data: { type: string; payload?: unknown; context?: { transaction_id?: string; message_id?: string; action?: string } }) {
    if (data.type === 'webhook' && data.context) {
      const { transaction_id, message_id, action } = data.context;
      if (transaction_id && message_id) {
        transactions.addWebhook(
          transaction_id,
          message_id,
          (action || 'webhook') as UCPAction,
          data.payload
        );
      }
    }
  }

  // ============================================================================
  // Handlers
  // ============================================================================

  async function handleDiscover() {
    if (!serverUrl) {
      discoveryError = 'Please enter a server URL';
      return;
    }

    isDiscovering = true;
    discoveryError = null;
    settings.setServerUrl(serverUrl);
    settings.setApiKey(apiKey);

    try {
      const client = getUCPClient(serverUrl);
      client.setApiKey(apiKey);
      const transactionId = `discover_${Date.now()}`;
      
      // Add transaction and request
      transactions.addTransaction(transactionId, serverUrl);
      const requestId = transactions.addRequest(
        transactionId,
        `msg_${Date.now()}`,
        'discover',
        { url: `${serverUrl}/.well-known/ucp` }
      );

      const result = await client.discover();

      // Add response
      transactions.addResponse(
        transactionId,
        `msg_${Date.now()}`,
        'discover',
        result.profile,
        requestId,
        result.validation.success ? undefined : result.validation.errors?.map(e => ({
          type: 'warning' as const,
          code: 'validation_warning',
          path: e.path,
          content: e.message,
        }))
      );

      // Select this transaction
      selectedTransactionId.set(transactionId);

      // Save profile and auto-load products
      discoveredProfile = result.profile;
      await loadProducts();

    } catch (err) {
      discoveryError = err instanceof Error ? err.message : 'Discovery failed';
    } finally {
      isDiscovering = false;
    }
  }

  async function loadProducts() {
    if (!serverUrl) return;

    isLoadingProducts = true;
    productsError = null;

    try {
      const client = getUCPClient(serverUrl);
      client.setApiKey(apiKey);
      
      // Per UCP spec: Get base endpoint from services["dev.ucp.shopping"].rest.endpoint
      // Then append /products
      let productsEndpoint: string | undefined;
      
      if (discoveredProfile && typeof discoveredProfile === 'object') {
        const profile = discoveredProfile as Record<string, unknown>;
        const ucp = profile.ucp as Record<string, unknown> | undefined;
        
        if (ucp?.services && typeof ucp.services === 'object') {
          const services = ucp.services as Record<string, { version?: string; rest?: { endpoint?: string } }>;
          
          // Look for the main shopping service
          const serviceNames = [
            'dev.ucp.shopping',
            'ucp.shopping',
            'shopping'
          ];
          
          for (const name of serviceNames) {
            const service = services[name];
            if (service?.rest?.endpoint) {
              // Found the base endpoint, append /products
              productsEndpoint = `${service.rest.endpoint.replace(/\/$/, '')}/products`;
              break;
            }
          }
        }
        
        // Also check capabilities for products to verify the capability exists
        if (productsEndpoint && ucp?.capabilities && Array.isArray(ucp.capabilities)) {
          const caps = ucp.capabilities as Array<{ name?: string }>;
          const hasProductsCap = caps.some((c) => c.name === 'dev.ucp.shopping.products');
          if (!hasProductsCap) {
            console.log('[UCP] Warning: products capability not found, but will try endpoint anyway');
          }
        }
      }
      
      // If no products endpoint found in profile, show helpful message
      if (!productsEndpoint) {
        products = [];
        productsError = 'No shopping service endpoint found in UCP profile. Check that services.dev.ucp.shopping.rest.endpoint is defined.';
        return;
      }
      
      // Store the products endpoint for later use
      productsBaseEndpoint = productsEndpoint;
      
      console.log('[UCP] Loading products from:', productsEndpoint);
      const result = await client.getProducts(productsEndpoint);
      products = result.products;
    } catch (err) {
      productsError = err instanceof Error ? err.message : 'Failed to load products';
    } finally {
      isLoadingProducts = false;
    }
  }

  async function handleSelectProduct(product: unknown) {
    if (!product || typeof product !== 'object') return;
    
    const p = product as Record<string, unknown>;
    const productId = (p.id || p.sku) as string | undefined;
    
    if (!productId) {
      console.error('[UCP] No product ID found');
      return;
    }

    console.log('[UCP] Fetching product details:', productId);
    
    isLoadingProductDetail = true;
    showProductDetail = true;
    selectedProductDetail = null;

    try {
      const client = getUCPClient(serverUrl);
      client.setApiKey(apiKey);
      
      const result = await client.getProductById(productId, productsBaseEndpoint || undefined);
      selectedProductDetail = result.product;
      console.log('[UCP] Product details:', result.product);
    } catch (err) {
      console.error('[UCP] Failed to fetch product details:', err);
      // Fall back to using the list product data
      selectedProductDetail = product;
    } finally {
      isLoadingProductDetail = false;
    }
  }

  function handleCloseProductDetail() {
    showProductDetail = false;
    selectedProductDetail = null;
  }

  async function handleAddToCart(cartItem: unknown, quantity: number) {
    if (!cartItem || typeof cartItem !== 'object') return;
    
    const item = cartItem as { product_id?: string; sku?: string; name?: string; price?: number; quantity?: number };
    const productId = item.product_id;
    
    if (!productId) {
      console.error('[UCP] No product_id in cart item');
      return;
    }

    isAddingToCart = true;
    console.log('[UCP] Add to cart:', { cartItem, quantity });

    try {
      const client = getUCPClient(serverUrl);
      client.setApiKey(apiKey);

      // Create cart if we don't have one
      if (!currentCartId) {
        console.log('[UCP] Creating new cart...');
        const createResult = await client.createCart();
        const cartData = createResult.cart as Record<string, unknown>;
        currentCartId = (cartData.id) as string;
        cart.setCart(createResult.cart);
        console.log('[UCP] Cart created:', currentCartId);
        
        // Log transaction
        const cartTransactionId = `cart_${Date.now()}`;
        transactions.addTransaction(cartTransactionId, serverUrl);
        const cartRequestId = transactions.addRequest(cartTransactionId, `msg_${Date.now()}`, 'create_cart', { action: 'create_cart' });
        transactions.addResponse(cartTransactionId, `msg_${Date.now()}`, 'create_cart', createResult.cart, cartRequestId);
      }

      // Add item to cart
      console.log('[UCP] Adding item to cart:', productId, quantity);
      const addResult = await client.addToCart(currentCartId, { 
        product_id: parseInt(productId, 10) || productId,
        quantity 
      });
      cart.setCart(addResult.cart);
      console.log('[UCP] Item added to cart:', addResult.cart);

      // Log transaction
      const addTransactionId = `add_${Date.now()}`;
      transactions.addTransaction(addTransactionId, serverUrl);
      const addRequestId = transactions.addRequest(addTransactionId, `msg_${Date.now()}`, 'add_to_cart', { 
        product_id: productId, 
        quantity 
      });
      transactions.addResponse(addTransactionId, `msg_${Date.now()}`, 'add_to_cart', addResult.cart, addRequestId);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[UCP] Add to cart failed:', err);
      
      // Show user-friendly error
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        showError('需要 API Key 才能操作購物車。請在上方輸入您的 API Key。');
      } else {
        showError(`加入購物車失敗: ${errorMsg}`);
      }
      
      // Still add locally for UX fallback
      cart.addItem({
        product_id: productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity,
      });
    } finally {
      isAddingToCart = false;
    }

    // Close product detail panel after adding
    showProductDetail = false;
  }

  async function handleLifecycleAction(stage: import('$lib/types/ucp').LifecycleStage) {
    console.log('[UCP] Lifecycle action:', stage);
    
    const client = getUCPClient(serverUrl);
    client.setApiKey(apiKey);
    
    const transactionId = `${stage}_${Date.now()}`;
    transactions.addTransaction(transactionId);
    
    try {
      switch (stage) {
        case 'create': {
          // Check if we have a server-side cart
          if (!currentCartId) {
            showError('請先將商品加入購物車再建立結帳。');
            console.warn('[UCP] Cannot create checkout: no cart exists. Add items first.');
            return;
          }
          
          // Show checkout address modal instead of calling API directly
          showCheckoutModal = true;
          console.log('[UCP] Opening checkout address modal for cart:', currentCartId);
          return; // Don't continue with transaction for now
        }
        
        case 'update': {
          // Update checkout session with payment_method (PATCH)
          if (!currentCheckoutId) {
            showError('請先建立結帳 session（點擊 Create）');
            return;
          }
          
          const updateRequestId = transactions.addRequest(transactionId, `msg_${Date.now()}`, 'update_checkout', { 
            checkout_id: currentCheckoutId,
            payment_method: 'bacs' // Bank transfer for testing
          });
          
          // UCP Shopping Agent expects payment_method in request body
          const updateResult = await client.updateCheckout(currentCheckoutId, {
            id: currentCheckoutId,
            payment_method: 'bacs'
          } as unknown as Parameters<typeof client.updateCheckout>[1]);
          
          transactions.addResponse(transactionId, `msg_${Date.now()}`, 'update_checkout', updateResult.session, updateRequestId);
          transactions.updateStatus(transactionId, 'completed');
          
          console.log('[UCP] Checkout session updated:', updateResult.session);
          break;
        }
        
        case 'complete': {
          // Complete the checkout with payment
          if (!currentCheckoutId) {
            showError('請先建立結帳 session（點擊 Create）');
            return;
          }
          
          const completeRequestId = transactions.addRequest(transactionId, `msg_${Date.now()}`, 'complete_checkout', { 
            checkout_id: currentCheckoutId,
            payment_data: { handler_id: 'bacs' }
          });
          
          const completeResult = await client.completeCheckout(currentCheckoutId, {
            payment_data: { handler_id: 'bacs' }
          });
          
          transactions.addResponse(transactionId, `msg_${Date.now()}`, 'complete_checkout', completeResult.session, completeRequestId);
          transactions.updateStatus(transactionId, 'completed');
          
          // Extract and save order_id from completion response
          const sessionData = completeResult.session as unknown as Record<string, unknown>;
          if (sessionData?.order_id) {
            currentOrderId = String(sessionData.order_id);
            console.log('[UCP] Order ID saved:', currentOrderId);
          } else if (sessionData?.order && typeof sessionData.order === 'object') {
            const orderObj = sessionData.order as Record<string, unknown>;
            if (orderObj.id) {
              currentOrderId = String(orderObj.id);
              console.log('[UCP] Order ID saved from order object:', currentOrderId);
            }
          }
          
          // Clear checkout ID after completion
          currentCheckoutId = null;
          
          console.log('[UCP] Checkout completed:', completeResult.session);
          break;
        }
        
        case 'order': {
          // Query order details
          if (!currentOrderId) {
            showError('請先完成結帳（點擊 Complete）以建立訂單。');
            return;
          }
          
          const orderRequestId = transactions.addRequest(transactionId, `msg_${Date.now()}`, 'get_order', { 
            order_id: currentOrderId 
          });
          
          const orderResult = await client.getOrder(currentOrderId);
          
          transactions.addResponse(transactionId, `msg_${Date.now()}`, 'get_order', orderResult.order, orderRequestId);
          transactions.updateStatus(transactionId, 'completed');
          
          console.log('[UCP] Order fetched:', orderResult.order);
          break;
        }
        
        default:
          console.log('[UCP] Unknown lifecycle stage:', stage);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[UCP] Lifecycle action ${stage} failed:`, err);
      transactions.updateStatus(transactionId, 'failed');
      
      // Show user-friendly error
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        showError('需要 API Key。請在上方輸入您的 API Key 後重試。');
      } else if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        showError(`操作失敗: 伺服器回傳 400 錯誤。可能需要更多資料（如收貨地址）。`);
      } else {
        showError(`${stage} 操作失敗: ${errorMsg}`);
      }
    }
  }

  function handleClearTransactions() {
    transactions.clear();
    selectedTransactionId.set(null);
    selectedMessageId.set(null);
  }

  // Divider drag handlers
  function handleDividerMouseDown(e: MouseEvent) {
    isDragging = true;
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    const container = document.querySelector('.main-content') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    currentLeftWidth = Math.max(20, Math.min(80, newWidth));
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      settings.setLeftPanelWidth(currentLeftWidth);
    }
  }

  async function handleCheckoutSubmit(addresses: { 
    shipping_address: Record<string, string>; 
    billing_address: Record<string, string> 
  }) {
    if (!currentCartId) {
      showError('購物車已過期，請重新加入商品。');
      showCheckoutModal = false;
      return;
    }

    console.log('[UCP] Submitting checkout with addresses:', addresses);

    const transactionId = `checkout_${Date.now()}`;
    transactions.addTransaction(transactionId, serverUrl);

    try {
      const client = getUCPClient(serverUrl);
      client.setApiKey(apiKey);

      const requestId = transactions.addRequest(transactionId, `msg_${Date.now()}`, 'create_checkout', { 
        cart_id: currentCartId,
        ...addresses
      });

      const result = await client.convertCartToCheckout(currentCartId, addresses);

      transactions.addResponse(transactionId, `msg_${Date.now()}`, 'create_checkout', result.checkout, requestId);
      transactions.updateStatus(transactionId, 'completed');

      // Extract checkout ID from result
      const checkoutData = result.checkout as Record<string, unknown>;
      if (checkoutData?.id) {
        currentCheckoutId = checkoutData.id as string;
        console.log('[UCP] Checkout session ID saved:', currentCheckoutId);
      }

      // Clear local cart and cart ID after successful checkout
      cart.clear();
      currentCartId = null;
      showCheckoutModal = false;

      console.log('[UCP] Checkout created successfully:', result.checkout);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[UCP] Checkout failed:', err);
      transactions.updateStatus(transactionId, 'failed');

      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        showError('需要 API Key。請在上方輸入您的 API Key 後重試。');
      } else if (errorMsg.includes('400')) {
        showError(`結帳失敗: 請檢查所有必填欄位是否已填寫。`);
      } else {
        showError(`結帳失敗: ${errorMsg}`);
      }
    }
  }
</script>

<svelte:window 
  onmousemove={handleMouseMove} 
  onmouseup={handleMouseUp}
/>

<!-- Error Toast -->
{#if errorToast}
  <div class="error-toast" role="alert">
    <span class="toast-message">{errorToast}</span>
    <button class="toast-close" onclick={() => errorToast = null}>✕</button>
  </div>
{/if}

<div class="debugger-layout">
  <!-- Header -->
  <Header 
    bind:showTunnelPanel
    bind:showSettingsPanel
    {sseConnected}
  />

  <!-- Lifecycle Visualizer -->
  {#if $showLifecycleVisualizer && $selectedTransaction}
    <LifecycleVisualizer 
      transaction={$selectedTransaction}
      onStageClick={(stage) => lifecycleFilter.set(stage)}
      onActionExecute={handleLifecycleAction}
    />
  {/if}

  <!-- Main Content Area -->
  <div class="main-content">
    <!-- Transaction Tree Sidebar -->
    {#if $showTransactionTree}
      <aside class="sidebar">
        <div class="sidebar-header">
          <GitBranch size={16} />
          <span>Transactions</span>
          <button class="btn-icon" onclick={handleClearTransactions} title="Clear all">
            <Trash2 size={14} />
          </button>
        </div>
        
        <!-- Server URL Input -->
        <div class="server-input">
          <input 
            type="text" 
            class="input" 
            placeholder="UCP Server URL (e.g., http://localhost:8080)"
            bind:value={serverUrl}
            onkeydown={(e) => e.key === 'Enter' && handleDiscover()}
          />
          <input 
            type="password" 
            class="input" 
            placeholder="API Key (optional)"
            bind:value={apiKey}
            onkeydown={(e) => e.key === 'Enter' && handleDiscover()}
          />
          <button 
            class="btn btn-primary" 
            onclick={handleDiscover}
            disabled={isDiscovering}
          >
            {#if isDiscovering}
              <RefreshCw size={14} class="animate-spin" />
            {:else}
              <Send size={14} />
            {/if}
            Discover
          </button>
        </div>

        {#if discoveryError}
          <div class="error-message">{discoveryError}</div>
        {/if}

        <TransactionTree 
          transactions={$transactionList}
          selectedTransactionId={$selectedTransactionId}
          selectedMessageId={$selectedMessageId}
          onSelectTransaction={(id) => selectedTransactionId.set(id)}
          onSelectMessage={(id) => selectedMessageId.set(id)}
        />

        <!-- Products Panel -->
        {#if discoveredProfile}
          <ProductsPanel 
            {products}
            isLoading={isLoadingProducts}
            error={productsError}
            onSelectProduct={handleSelectProduct}
            onRefresh={loadProducts}
          />
        {/if}
      </aside>
    {/if}

    <!-- Split View Panels -->
    <div class="split-view">
      <!-- Left Panel: Actual Payload -->
      <div class="panel left-panel" style="width: {showReferencePanel ? currentLeftWidth : 100}%">
        <div class="panel-header">
          <Activity size={16} />
          <span>Actual Payload</span>
          {#if $selectedMessage}
            <span class="badge badge-{$selectedMessage.status === 'completed' ? 'success' : $selectedMessage.status === 'failed' ? 'error' : 'pending'}">
              {$selectedMessage.action}
            </span>
          {/if}
          
          <!-- Reference Panel Toggle Button -->
          <button 
            class="btn-icon toggle-ref-btn" 
            onclick={() => showReferencePanel = !showReferencePanel}
            title={showReferencePanel ? 'Hide Reference' : 'Show Reference Template'}
          >
            {#if showReferencePanel}
              <PanelRightClose size={16} />
            {:else}
              <BookOpen size={16} />
            {/if}
          </button>
        </div>
        <div class="panel-content">
          {#if $selectedMessage}
            <JsonViewer 
              data={$selectedMessage.payload}
              errors={$selectedMessage.errors}
            />
          {:else}
            <div class="empty-state">
              <Server size={48} class="text-muted" />
              <p>Select a message to view its payload</p>
              <p class="text-sm text-muted">Enter a UCP server URL above and click Discover to start</p>
            </div>
          {/if}
        </div>
      </div>

      {#if showReferencePanel}
        <!-- Divider -->
        <div 
          class="divider"
          class:dragging={isDragging}
          onmousedown={handleDividerMouseDown}
          role="separator"
          aria-orientation="vertical"
          tabindex="0"
        ></div>

        <!-- Right Panel: Reference Template -->
        <div class="panel right-panel" style="width: {100 - currentLeftWidth}%">
          <ReferencePanel 
            action={$selectedMessage?.action}
            onClose={() => showReferencePanel = false}
          />
        </div>
      {/if}
    </div>
  </div>

  <!-- Tunnel Manager Slide-out -->
  {#if showTunnelPanel}
    <div class="slide-panel" onclick={() => showTunnelPanel = false}>
      <div class="slide-panel-content" onclick={(e) => e.stopPropagation()}>
        <TunnelManager onClose={() => showTunnelPanel = false} />
      </div>
    </div>
  {/if}

  <!-- Product Detail Slide-out -->
  {#if showProductDetail}
    <div class="slide-panel slide-panel-wide" onclick={handleCloseProductDetail}>
      <div class="slide-panel-content slide-panel-content-wide" onclick={(e) => e.stopPropagation()}>
        <ProductDetail 
          product={selectedProductDetail}
          isLoading={isLoadingProductDetail}
          onClose={handleCloseProductDetail}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  {/if}

  <!-- Checkout Address Modal -->
  {#if showCheckoutModal && currentCartId}
    <CheckoutAddressModal 
      cartId={currentCartId}
      onSubmit={handleCheckoutSubmit}
      onClose={() => showCheckoutModal = false}
    />
  {/if}
</div>

<style>
  .debugger-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 320px;
    min-width: 280px;
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
  }

  .sidebar-header .btn-icon {
    margin-left: auto;
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
  }

  .sidebar-header .btn-icon:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .server-input {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-message {
    padding: 0.5rem 0.75rem;
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--accent-red);
    font-size: 0.875rem;
    border-bottom: 1px solid var(--border-color);
  }

  .split-view {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--bg-secondary);
  }

  .left-panel {
    border-right: none;
  }

  .right-panel {
    border-left: none;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    flex-shrink: 0;
  }

  .toggle-ref-btn {
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

  .toggle-ref-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--accent-blue);
    border-color: var(--accent-blue);
  }

  .panel-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .divider {
    width: 4px;
    background-color: var(--border-color);
    cursor: col-resize;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }

  .divider:hover,
  .divider.dragging {
    background-color: var(--accent-blue);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
    gap: 1rem;
  }

  .empty-state p {
    margin: 0;
  }

  .text-muted {
    color: var(--text-muted);
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .slide-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .slide-panel-content {
    width: 400px;
    max-width: 100%;
    background-color: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    overflow-y: auto;
    animation: slideIn 0.2s ease-out;
  }

  .slide-panel-content-wide {
    width: 700px;
    max-width: 90%;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Error Toast */
  .error-toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background-color: rgba(220, 38, 38, 0.95);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    animation: toastSlideIn 0.3s ease-out;
    max-width: 500px;
  }

  .toast-message {
    font-size: 0.9375rem;
    line-height: 1.4;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0.7;
    padding: 0;
    line-height: 1;
  }

  .toast-close:hover {
    opacity: 1;
  }

  @keyframes toastSlideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
