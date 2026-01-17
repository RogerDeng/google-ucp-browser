<script lang="ts">
  import { ShoppingCart, Package, Check, RefreshCw, Search, ChevronDown, ChevronRight } from 'lucide-svelte';

  interface Category {
    id: number | string;
    name: string;
  }

  interface Product {
    id: string;
    title?: string;
    name?: string;
    description?: string;
    price?: number | { amount?: number; sale?: number };
    currency?: string;
    image_url?: string;
    image?: string;
    images?: { main?: string };
    sku?: string;
    categories?: Category[];
  }

  interface Props {
    products: unknown[];
    isLoading: boolean;
    error: string | null;
    onSelectProduct: (product: Product) => void;
    onRefresh: () => void;
    onSearch?: (query: string) => void;
    // Pagination props
    meta?: { page: number; per_page: number; total: number; total_pages: number } | null;
    onPageChange?: (page: number) => void;
    // Category filter props
    serverCategories?: unknown[];
    selectedCategoryId?: number | null;
    onCategoryChange?: (categoryId: number | null) => void;
  }

  let { 
    products, 
    isLoading, 
    error, 
    onSelectProduct, 
    onRefresh, 
    onSearch,
    meta,
    onPageChange,
    serverCategories,
    selectedCategoryId: selectedCatId,
    onCategoryChange
  }: Props = $props();

  let selectedProductId = $state<string | null>(null);
  let searchQuery = $state('');
  let expandedCategories = $state<Set<string>>(new Set(['all']));

  // Extract unique categories from products
  const categories = $derived(() => {
    const catMap = new Map<string, string>();
    catMap.set('all', '全部商品');
    
    for (const product of products) {
      if (product && typeof product === 'object') {
        const p = product as Record<string, unknown>;
        const cats = p.categories as Category[] | undefined;
        if (Array.isArray(cats)) {
          for (const cat of cats) {
            if (cat.id && cat.name) {
              catMap.set(String(cat.id), cat.name);
            }
          }
        }
      }
    }
    
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  });

  // Flatten hierarchical categories for select dropdown with indentation
  interface FlatCategory {
    id: number | string;
    name: string;
    depth: number;
    parent_id?: number;
  }

  const flattenedServerCategories = $derived(() => {
    if (!serverCategories || serverCategories.length === 0) return [];
    
    const result: FlatCategory[] = [];
    const categoryMap = new Map<number, { id: number; name: string; parent_id: number; children?: unknown[] }>();
    
    // Build map and find root categories - filter out categories without name
    for (const cat of serverCategories) {
      const c = cat as { id: number; name: string; parent_id?: number; children?: unknown[] };
      if (c.id !== undefined && c.name) { // Only add if has id and name
        categoryMap.set(c.id, { ...c, parent_id: c.parent_id || 0 });
      }
    }
    
    // Recursive function to add categories with depth
    function addCategoryWithChildren(catId: number, depth: number) {
      const cat = categoryMap.get(catId);
      if (!cat || !cat.name) return; // Skip if no name
      
      // Add indentation prefix based on depth
      const prefix = depth > 0 ? '　'.repeat(depth - 1) + '└ ' : '';
      result.push({
        id: cat.id,
        name: prefix + cat.name,
        depth,
        parent_id: cat.parent_id
      });
      
      // Add children if present
      if (cat.children && Array.isArray(cat.children)) {
        for (const child of cat.children) {
          const ch = child as { id: number; name: string; parent_id?: number; children?: unknown[] };
          if (ch.id !== undefined && ch.name) { // Only add if has id and name
            categoryMap.set(ch.id, { ...ch, parent_id: ch.parent_id || cat.id });
            addCategoryWithChildren(ch.id, depth + 1);
          }
        }
      }
    }
    
    // First pass: add all root categories (parent_id === 0 or undefined)
    const rootCategories = serverCategories.filter(cat => {
      const c = cat as { parent_id?: number; name?: string };
      return (!c.parent_id || c.parent_id === 0) && c.name; // Must have name
    });
    
    for (const cat of rootCategories) {
      const c = cat as { id: number };
      addCategoryWithChildren(c.id, 0);
    }
    
    // If no hierarchy was built (flat list), just return flattened list
    if (result.length === 0) {
      for (const cat of serverCategories) {
        const c = cat as { id: number | string; name: string; parent_id?: number };
        if (c.name) { // Only add if has name
          result.push({ id: c.id, name: c.name, depth: 0, parent_id: c.parent_id });
        }
      }
    }
    
    return result;
  });

  // Filter products by search query
  const filteredProducts = $derived(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      if (!product || typeof product !== 'object') return false;
      const p = product as Record<string, unknown>;
      const title = getProductTitle(product).toLowerCase();
      const sku = ((p.sku || '') as string).toLowerCase();
      const desc = ((p.description || '') as string).toLowerCase();
      return title.includes(query) || sku.includes(query) || desc.includes(query);
    });
  });

  // Group products by category
  const productsByCategory = $derived(() => {
    const result = new Map<string, unknown[]>();
    result.set('all', filteredProducts());
    
    for (const product of filteredProducts()) {
      if (product && typeof product === 'object') {
        const p = product as Record<string, unknown>;
        const cats = p.categories as Category[] | undefined;
        if (Array.isArray(cats)) {
          for (const cat of cats) {
            const catId = String(cat.id);
            if (!result.has(catId)) {
              result.set(catId, []);
            }
            result.get(catId)!.push(product);
          }
        }
      }
    }
    
    return result;
  });

  function getProductTitle(product: unknown): string {
    if (!product || typeof product !== 'object') return 'Unknown Product';
    const p = product as Record<string, unknown>;
    return (p.title || p.name || p.sku || p.id || 'Unknown Product') as string;
  }

  function getProductPrice(product: unknown): string {
    if (!product || typeof product !== 'object') return '';
    const p = product as Record<string, unknown>;
    let priceValue: number | undefined;
    
    if (typeof p.price === 'number') {
      priceValue = p.price;
    } else if (p.price && typeof p.price === 'object') {
      const priceObj = p.price as Record<string, unknown>;
      priceValue = (priceObj.sale || priceObj.amount) as number | undefined;
    }
    
    if (typeof priceValue !== 'number') return '';
    
    // Price in smallest unit (e.g., cents or TWD)
    const formatted = priceValue >= 100 ? priceValue.toLocaleString() : priceValue.toFixed(2);
    const currency = (p.currency || 'TWD') as string;
    return `${currency} ${formatted}`;
  }

  function getProductImage(product: unknown): string | null {
    if (!product || typeof product !== 'object') return null;
    const p = product as Record<string, unknown>;
    // Check images.main first (UCP format)
    if (p.images && typeof p.images === 'object') {
      const images = p.images as Record<string, unknown>;
      if (images.main) return images.main as string;
    }
    return (p.image_url || p.image || null) as string | null;
  }

  function getProductId(product: unknown): string {
    if (!product || typeof product !== 'object') return '';
    const p = product as Record<string, unknown>;
    return (p.id || p.sku || '') as string;
  }

  function handleSelect(product: unknown) {
    const id = getProductId(product);
    selectedProductId = id;
    onSelectProduct(product as Product);
  }

  function toggleCategory(catId: string) {
    const newSet = new Set(expandedCategories);
    if (newSet.has(catId)) {
      newSet.delete(catId);
    } else {
      newSet.add(catId);
    }
    expandedCategories = newSet;
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  }
</script>

<div class="products-panel">
  <div class="panel-header">
    <Package size={16} />
    <span>Products</span>
    <span class="product-count">{filteredProducts().length}</span>
    <button class="btn-icon" onclick={onRefresh} disabled={isLoading} title="Refresh products">
      <RefreshCw size={14} class={isLoading ? 'animate-spin' : ''} />
    </button>
  </div>

  <!-- Search Input -->
  <div class="search-box">
    <Search size={14} class="search-icon" />
    <input 
      type="text" 
      class="search-input" 
      placeholder="搜尋產品..."
      bind:value={searchQuery}
      onkeydown={handleSearchKeydown}
    />
    {#if onSearch}
      <button 
        class="btn-search" 
        onclick={() => onSearch && searchQuery.trim() && onSearch(searchQuery)}
        disabled={!searchQuery.trim()}
        title="API 搜尋"
      >
        搜尋
      </button>
    {/if}
  </div>

  <!-- Pagination Info & Category Filter -->
  {#if meta || (serverCategories && serverCategories.length > 0)}
    <div class="filter-bar">
      {#if meta}
        <span class="pagination-info">
          共 {meta.total} 個產品，第 {meta.page}/{meta.total_pages} 頁
        </span>
        <div class="pagination-controls">
          <button 
            class="btn-page" 
            onclick={() => onPageChange && onPageChange(meta.page - 1)}
            disabled={!onPageChange || meta.page <= 1}
            title="上一頁"
          >
            ◀
          </button>
          <button 
            class="btn-page" 
            onclick={() => onPageChange && onPageChange(meta.page + 1)}
            disabled={!onPageChange || meta.page >= meta.total_pages}
            title="下一頁"
          >
            ▶
          </button>
        </div>
      {/if}
      {#if serverCategories && serverCategories.length > 0 && onCategoryChange}
        <select 
          class="category-select" 
          value={selectedCatId !== null && selectedCatId !== undefined ? String(selectedCatId) : ''}
          onchange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            onCategoryChange(val ? parseInt(val, 10) : null);
          }}
        >
          <option value="">全部分類</option>
          {#each flattenedServerCategories() as cat}
            <option value={String(cat.id)}>{cat.name}</option>
          {/each}
        </select>
      {/if}
    </div>
  {/if}

  <div class="products-content">
    {#if isLoading}
      <div class="loading-state">
        <RefreshCw size={24} class="animate-spin" />
        <p>Loading products...</p>
      </div>
    {:else if error}
      <div class="info-state" class:is-error={!error.includes('No products endpoint')}>
        <p>{error}</p>
        {#if error.includes('No products endpoint')}
          <p class="hint">Check the UCP profile's services section for a products endpoint.</p>
        {:else}
          <button class="btn btn-primary btn-sm" onclick={onRefresh}>Try Again</button>
        {/if}
      </div>
    {:else if filteredProducts().length === 0}
      <div class="empty-state">
        <Package size={48} />
        {#if searchQuery}
          <p>找不到符合「{searchQuery}」的產品</p>
          <button class="btn btn-sm" onclick={() => searchQuery = ''}>清除搜尋</button>
        {:else}
          <p>No products found</p>
          <p class="hint">Complete discovery first, then click refresh to load products</p>
        {/if}
      </div>
    {:else}
      <div class="product-list">
        {#each filteredProducts() as product}
          {@const id = getProductId(product)}
          {@const title = getProductTitle(product)}
          {@const price = getProductPrice(product)}
          {@const image = getProductImage(product)}
          {@const isSelected = selectedProductId === id}
          
          <button 
            class="product-card"
            class:selected={isSelected}
            onclick={() => handleSelect(product)}
          >
            {#if image}
              <div class="product-image">
                <img src={image} alt={title} />
              </div>
            {:else}
              <div class="product-image placeholder">
                <Package size={24} />
              </div>
            {/if}
            
            <div class="product-info">
              <h4 class="product-title">{title}</h4>
              {#if price}
                <span class="product-price">{price}</span>
              {/if}
              <span class="product-id">{id}</span>
            </div>

            {#if isSelected}
              <div class="selected-badge">
                <Check size={14} />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .products-panel {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border-color);
    max-height: 300px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
  }

  :global(.search-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .product-count {
    background-color: var(--accent-blue);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .btn-icon {
    margin-left: auto;
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }

  .btn-icon:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .btn-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-search {
    padding: 0.375rem 0.75rem;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
    flex-shrink: 0;
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    font-size: 0.75rem;
  }

  .pagination-info {
    color: var(--text-muted);
  }

  .pagination-controls {
    display: flex;
    gap: 0.25rem;
    margin-left: auto;
  }

  .btn-page {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.75rem;
  }

  .btn-page:hover:not(:disabled) {
    background: var(--accent-blue);
    color: white;
  }

  .btn-page:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .category-select {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-search:hover:not(:disabled) {
    background-color: var(--accent-blue-hover, #2563eb);
  }

  .btn-search:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .products-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .loading-state,
  .info-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text-muted);
    text-align: center;
    gap: 0.5rem;
  }

  .info-state {
    color: var(--accent-yellow);
  }

  .info-state.is-error {
    color: var(--accent-red);
  }

  .empty-state .hint,
  .info-state .hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .product-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .product-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    position: relative;
  }

  .product-card:hover {
    border-color: var(--accent-blue);
  }

  .product-card.selected {
    border-color: var(--accent-green);
    background-color: rgba(34, 197, 94, 0.1);
  }

  .product-image {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background-color: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-image.placeholder {
    color: var(--text-muted);
  }

  .product-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .product-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .product-price {
    font-size: 0.8125rem;
    color: var(--accent-green);
    font-weight: 500;
  }

  .product-id {
    font-size: 0.6875rem;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selected-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 20px;
    height: 20px;
    background-color: var(--accent-green);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
