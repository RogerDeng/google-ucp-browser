<script lang="ts">
  import { X, MapPin, User, Mail, Phone, Truck } from 'lucide-svelte';

  interface ShippingAddress {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }

  interface Props {
    cartId: string;
    onSubmit: (addresses: { shipping_address: Record<string, string>; billing_address: Record<string, string> }) => void;
    onClose: () => void;
  }

  let { cartId, onSubmit, onClose }: Props = $props();

  // Form state
  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let phone = $state('');
  let address1 = $state('');
  let address2 = $state('');
  let city = $state('');
  let stateRegion = $state('');
  let postcode = $state('');
  let country = $state('TW');
  
  let isSubmitting = $state(false);
  let useSameForBilling = $state(true);

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    const shipping: Record<string, string> = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address_1: address1,
      city,
      state: stateRegion,
      postcode,
      country,
    };
    
    // Add address_2 only if filled
    if (address2) {
      shipping.address_2 = address2;
    }

    onSubmit({
      shipping_address: shipping,
      billing_address: shipping, // Use same address for billing
    });
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div class="header-title">
        <Truck size={20} />
        <h2>收貨資訊</h2>
      </div>
      <button class="btn-close" onclick={onClose}>
        <X size={20} />
      </button>
    </div>

    <form class="modal-body" onsubmit={handleSubmit}>
      <p class="cart-id-info">購物車 ID: <code>{cartId.substring(0, 8)}...</code></p>

      <div class="form-section">
        <h3><User size={16} /> 收件人</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="lastName">姓氏 *</label>
            <input type="text" id="lastName" bind:value={lastName} required placeholder="王" />
          </div>
          <div class="form-group">
            <label for="firstName">名字 *</label>
            <input type="text" id="firstName" bind:value={firstName} required placeholder="小明" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3><Mail size={16} /> 聯絡方式</h3>
        <div class="form-group">
          <label for="email">Email *</label>
          <input type="email" id="email" bind:value={email} required placeholder="user@example.com" />
        </div>
        <div class="form-group">
          <label for="phone">電話</label>
          <input type="tel" id="phone" bind:value={phone} placeholder="0912345678" />
        </div>
      </div>

      <div class="form-section">
        <h3><MapPin size={16} /> 收貨地址</h3>
        <div class="form-group">
          <label for="address1">地址 *</label>
          <input type="text" id="address1" bind:value={address1} required placeholder="信義路五段7號" />
        </div>
        <div class="form-group">
          <label for="address2">地址（續）</label>
          <input type="text" id="address2" bind:value={address2} placeholder="10樓" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="city">城市 *</label>
            <input type="text" id="city" bind:value={city} required placeholder="台北市" />
          </div>
          <div class="form-group">
            <label for="state">區域</label>
            <input type="text" id="state" bind:value={stateRegion} placeholder="信義區" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="postcode">郵遞區號 *</label>
            <input type="text" id="postcode" bind:value={postcode} required placeholder="110" />
          </div>
          <div class="form-group">
            <label for="country">國家</label>
            <select id="country" bind:value={country}>
              <option value="TW">台灣</option>
              <option value="HK">香港</option>
              <option value="JP">日本</option>
              <option value="US">美國</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick={onClose}>取消</button>
        <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '處理中...' : '建立結帳'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background-color: var(--bg-secondary);
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--bg-tertiary);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--accent-blue);
  }

  .header-title h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
  }

  .btn-close:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .cart-id-info {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .cart-id-info code {
    background-color: var(--bg-tertiary);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: monospace;
  }

  .form-section {
    margin-bottom: 1.5rem;
  }

  .form-section h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.9375rem;
    transition: border-color 0.15s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent-blue);
  }

  .form-group input::placeholder {
    color: var(--text-muted);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    margin-top: 1rem;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .btn-primary {
    background-color: var(--accent-blue);
    border: none;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--accent-purple);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
