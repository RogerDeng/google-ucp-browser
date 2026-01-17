<script lang="ts">
  import { X, ShoppingCart, Tag, Package, Star, ExternalLink, ChevronLeft } from 'lucide-svelte';

  interface ProductDetail {
    id: string;
    sku?: string;
    name?: string;
    type?: string;
    url?: string;
    description?: { short?: string; full?: string } | string;
    price?: {
      amount?: number;
      regular?: number;
      sale?: number;
      currency?: string;
      on_sale?: boolean;
    };
    availability?: {
      status?: string;
      stock_qty?: number | null;
    };
    images?: {
      main?: string;
      gallery?: string[];
    };
    categories?: Array<{ id: number; name: string }>;
    attributes?: Array<{ name: string; value: string }>;
    rating?: {
      average?: number;
      count?: number;
    };
  }

  interface Props {
    product: unknown;
    isLoading: boolean;
    onClose: () => void;
    onAddToCart: (product: unknown, quantity: number) => void;
  }

  let { product, isLoading, onClose, onAddToCart }: Props = $props();

  let quantity = $state(1);
  const p = $derived(product as ProductDetail | null);

  // Reset quantity when product changes
  $effect(() => {
    if (product) {
      quantity = 1;
    }
  });

  function handleAddToCartClick() {
    if (!p) return;
    // Create a plain object to avoid $state proxy warnings in console
    const cartItem = {
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price?.amount || p.price?.sale,
      quantity,
    };
    onAddToCart(cartItem, quantity);
  }

  function formatPrice(amount: number | undefined, currency: string = 'TWD'): string {
    if (typeof amount !== 'number') return '';
    // Assuming amount is in smallest unit (cents/分)
    const value = amount >= 100 ? amount : amount * 100;
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  }

  function getDescription(desc: ProductDetail['description']): { short: string; full: string } {
    if (!desc) return { short: '', full: '' };
    if (typeof desc === 'string') return { short: desc, full: desc };
    return { short: desc.short || '', full: desc.full || desc.short || '' };
  }

  function getStockStatusText(status: string | undefined): string {
    switch (status) {
      case 'IN_STOCK': return '有庫存';
      case 'OUT_OF_STOCK': return '缺貨中';
      case 'ON_BACKORDER': return '可預訂';
      default: return status || '未知';
    }
  }

  function getStockStatusClass(status: string | undefined): string {
    switch (status) {
      case 'IN_STOCK': return 'in-stock';
      case 'OUT_OF_STOCK': return 'out-of-stock';
      case 'ON_BACKORDER': return 'backorder';
      default: return '';
    }
  }
</script>

<div class="product-detail">
  <div class="detail-header">
    <button class="back-btn" onclick={onClose}>
      <ChevronLeft size={20} />
      <span>返回產品列表</span>
    </button>
  </div>

  {#if isLoading}
    <div class="loading-state">
      <Package size={48} class="animate-pulse" />
      <p>載入產品資訊中...</p>
    </div>
  {:else if !p}
    <div class="error-state">
      <p>無法載入產品資訊</p>
    </div>
  {:else}
    <div class="detail-content">
      <!-- Product Image -->
      <div class="product-image-section">
        {#if p.images?.main}
          <img src={p.images.main} alt={p.name} class="main-image" />
        {:else}
          <div class="image-placeholder">
            <Package size={64} />
          </div>
        {/if}

        {#if p.images?.gallery && p.images.gallery.length > 0}
          <div class="gallery">
            {#each p.images.gallery as img}
              <img src={img} alt="Gallery" class="gallery-image" />
            {/each}
          </div>
        {/if}
      </div>

      <!-- Product Info -->
      <div class="product-info-section">
        <div class="product-header">
          <h2 class="product-name">{p.name || 'Unknown Product'}</h2>
          
          {#if p.url}
            <a href={p.url} target="_blank" rel="noopener" class="product-link">
              <ExternalLink size={14} />
              查看原始頁面
            </a>
          {/if}
        </div>

        <!-- SKU & Type -->
        <div class="meta-info">
          {#if p.sku}
            <span class="meta-item">
              <Tag size={12} />
              SKU: {p.sku}
            </span>
          {/if}
          {#if p.type}
            <span class="meta-item type-badge">{p.type}</span>
          {/if}
          <span class="meta-item">ID: {p.id}</span>
        </div>

        <!-- Price -->
        {#if p.price}
          <div class="price-section">
            {#if p.price.on_sale && p.price.regular}
              <span class="original-price">{formatPrice(p.price.regular, p.price.currency)}</span>
            {/if}
            <span class="current-price" class:on-sale={p.price.on_sale}>
              {formatPrice(p.price.amount || p.price.sale, p.price.currency)}
            </span>
            {#if p.price.on_sale}
              <span class="sale-badge">特價中</span>
            {/if}
          </div>
        {/if}

        <!-- Availability -->
        {#if p.availability}
          <div class="availability-section">
            <span class="stock-status {getStockStatusClass(p.availability.status)}">
              {getStockStatusText(p.availability.status)}
            </span>
            {#if p.availability.stock_qty !== null && p.availability.stock_qty !== undefined}
              <span class="stock-qty">（剩餘 {p.availability.stock_qty} 件）</span>
            {/if}
          </div>
        {/if}

        <!-- Rating -->
        {#if p.rating && (p.rating.count ?? 0) > 0}
          <div class="rating-section">
            <Star size={16} class="star-icon" />
            <span class="rating-value">{p.rating.average?.toFixed(1)}</span>
            <span class="rating-count">（{p.rating.count} 則評價）</span>
          </div>
        {/if}

        <!-- Categories -->
        {#if p.categories && p.categories.length > 0}
          <div class="categories-section">
            <span class="section-label">分類：</span>
            <div class="category-tags">
              {#each p.categories as cat}
                <span class="category-tag">{cat.name}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Description -->
        {#if p.description}
          {@const desc = getDescription(p.description)}
          {#if desc.full || desc.short}
            <div class="description-section">
              <h3 class="section-title">產品說明</h3>
              <div class="description-content">
                {#if desc.full}
                  {@html desc.full}
                {:else}
                  {desc.short}
                {/if}
              </div>
            </div>
          {/if}
        {/if}

        <!-- Attributes -->
        {#if p.attributes && p.attributes.length > 0}
          <div class="attributes-section">
            <h3 class="section-title">規格</h3>
            <table class="attributes-table">
              <tbody>
                {#each p.attributes as attr}
                  <tr>
                    <td class="attr-name">{attr.name}</td>
                    <td class="attr-value">{attr.value}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- Quantity Selector -->
        <div class="quantity-section">
          <span class="section-label">數量：</span>
          <div class="quantity-controls">
            <button 
              class="qty-btn"
              onclick={() => quantity = Math.max(1, quantity - 1)}
              disabled={quantity <= 1}
            >−</button>
            <input 
              type="number" 
              class="qty-input" 
              min="1" 
              max="99"
              bind:value={quantity}
            />
            <button 
              class="qty-btn"
              onclick={() => quantity = Math.min(99, quantity + 1)}
            >+</button>
          </div>
        </div>

        <!-- Add to Cart Button -->
        <div class="action-section">
          <button 
            class="btn btn-primary add-to-cart-btn"
            onclick={handleAddToCartClick}
            disabled={p.availability?.status === 'OUT_OF_STOCK'}
          >
            <ShoppingCart size={18} />
            加入購物車
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .product-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-secondary);
  }

  .detail-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .back-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: var(--text-muted);
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    gap: 2rem;
  }

  .product-image-section {
    flex-shrink: 0;
    width: 300px;
  }

  .main-image {
    width: 100%;
    border-radius: 12px;
    background-color: var(--bg-tertiary);
  }

  .image-placeholder {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    border-radius: 12px;
    color: var(--text-muted);
  }

  .gallery {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    overflow-x: auto;
  }

  .gallery-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .gallery-image:hover {
    opacity: 1;
  }

  .product-info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .product-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .product-name {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .product-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--accent-blue);
    font-size: 0.8125rem;
    text-decoration: none;
    white-space: nowrap;
  }

  .product-link:hover {
    text-decoration: underline;
  }

  .meta-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .type-badge {
    padding: 0.125rem 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    text-transform: uppercase;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .price-section {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .original-price {
    font-size: 1rem;
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .current-price {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .current-price.on-sale {
    color: var(--accent-red);
  }

  .sale-badge {
    padding: 0.25rem 0.5rem;
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .availability-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stock-status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .stock-status.in-stock {
    background-color: rgba(34, 197, 94, 0.15);
    color: var(--accent-green);
  }

  .stock-status.out-of-stock {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--accent-red);
  }

  .stock-status.backorder {
    background-color: rgba(234, 179, 8, 0.15);
    color: var(--accent-yellow);
  }

  .stock-qty {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .rating-section {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  :global(.star-icon) {
    color: #fbbf24;
  }

  .rating-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .rating-count {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .categories-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .section-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .category-tags {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .category-tag {
    padding: 0.25rem 0.625rem;
    background-color: var(--accent-blue);
    color: white;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .description-section,
  .attributes-section {
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .section-title {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .description-content {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .description-content :global(p) {
    margin: 0 0 0.75rem 0;
  }

  .attributes-table {
    width: 100%;
    border-collapse: collapse;
  }

  .attributes-table td {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.875rem;
  }

  .attr-name {
    color: var(--text-muted);
    width: 35%;
  }

  .attr-value {
    color: var(--text-primary);
  }

  .quantity-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .quantity-controls {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .qty-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    border: none;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .qty-btn:hover:not(:disabled) {
    background-color: var(--bg-secondary);
  }

  .qty-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .qty-input {
    width: 60px;
    height: 40px;
    text-align: center;
    border: none;
    border-left: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
  }

  .qty-input::-webkit-outer-spin-button,
  .qty-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .qty-input[type=number] {
    -moz-appearance: textfield;
  }

  .action-section {
    padding-top: 1.5rem;
    margin-top: auto;
  }

  .add-to-cart-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .add-to-cart-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.animate-pulse) {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
</style>
