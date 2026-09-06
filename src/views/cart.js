import { cartStore } from '../store/cartStore.js';
import { ordersStore } from '../store/ordersStore.js';

export function createCartView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page cart-view';
  container.id = 'cart-view-content';

  let discountRate = 0;
  let appliedPromoCode = '';

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Encrypted Checkout · Immediate License &amp; Stems Delivery</div>
      <h1 class="view-title">Your Studio Cart</h1>
      <p class="view-subtitle">Review your selected beat licenses, scheduled sessions, and audio services before instant checkout.</p>
    </div>

    <div class="cart-layout" id="cart-layout">
      <!-- Left Column: Items List -->
      <div class="cart-items-column">
        <div class="cart-items-header">
          <h2>Order Items (<span id="cart-items-count">0</span>)</h2>
          <button type="button" class="btn-clear-cart" id="btn-clear-cart">Clear All</button>
        </div>
        <div class="cart-items-list" id="cart-items-list"></div>

        <div class="cart-continue-wrap">
          <button type="button" class="btn-outline-sm" id="btn-browse-more">
            ← Continue Browsing Beats
          </button>
        </div>
      </div>

      <!-- Right Column: Checkout & Summary -->
      <div class="cart-summary-column">
        <div class="cart-summary-card">
          <h3>Order Summary</h3>
          <div class="summary-breakdown">
            <div class="sum-row">
              <span>Subtotal</span>
              <strong id="sum-subtotal">$0</strong>
            </div>
            <div class="sum-row" id="sum-discount-row" style="display: none;">
              <span>Promo Discount (<span id="sum-discount-label"></span>)</span>
              <strong id="sum-discount" style="color: #00ffaa;">-$0</strong>
            </div>
            <div class="sum-row">
              <span>Delivery / Audio Ingestion</span>
              <strong style="color: var(--signal-bright);">Free (Instant)</strong>
            </div>
            <div class="sum-divider"></div>
            <div class="sum-row sum-total-row">
              <span>Total Due</span>
              <strong class="total-price" id="sum-total">$0</strong>
            </div>
          </div>

          <!-- Promo Code Input -->
          <div class="promo-wrap">
            <div class="promo-input-row">
              <input type="text" id="promo-input" placeholder="Promo code (try STUDIO10)">
              <button type="button" id="btn-apply-promo" class="btn-apply-promo">Apply</button>
            </div>
            <p class="promo-msg" id="promo-msg"></p>
          </div>

          <!-- Checkout Form -->
          <form class="checkout-form" id="checkout-form">
            <h4>Customer Information</h4>
            <label>Full Legal / Artist Name
              <input type="text" name="buyer_name" required placeholder="e.g. Alex Rivera" autocomplete="name">
            </label>
            <label>Delivery Email (for stems &amp; license agreement)
              <input type="email" name="buyer_email" required placeholder="you@recordlabel.com" autocomplete="email">
            </label>

            <h4 style="margin-top: 18px;">Select Payment Method</h4>
            <div class="payment-radios">
              <label class="pay-option">
                <input type="radio" name="payment_method" value="UPI / GPay / PhonePe" checked>
                <span>UPI / GPay / PhonePe (Fastest)</span>
              </label>
              <label class="pay-option">
                <input type="radio" name="payment_method" value="Credit / Debit Card">
                <span>Credit / Debit Card (Stripe)</span>
              </label>
              <label class="pay-option">
                <input type="radio" name="payment_method" value="PayPal">
                <span>PayPal</span>
              </label>
            </div>

            <button type="submit" class="button button-primary cta-button" id="btn-complete-checkout" style="width: 100%; border-radius: 999px; margin-top: 24px;">
              Complete Purchase <span aria-hidden="true">›</span>
            </button>
            <p class="checkout-guarantee">🔒 Instant lossless download link + PDF license generated upon confirmation.</p>
          </form>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="cart-empty-state" id="cart-empty-state" style="display: none;">
      <div class="empty-icon">🛒</div>
      <h2>Your Cart is Empty</h2>
      <p>Explore original beats, studio mixing packages, or schedule a 1-on-1 production session.</p>
      <div class="empty-actions">
        <button type="button" class="button button-primary cta-button" id="btn-empty-beats">
          Browse Original Beats <span aria-hidden="true">›</span>
        </button>
        <button type="button" class="btn-outline-sm" id="btn-empty-sessions">
          Book a Session
        </button>
      </div>
    </div>

    <!-- Order Confirmed Modal / View -->
    <div class="checkout-confirmed-panel" id="checkout-confirmed" style="display: none;">
      <div class="confirmed-card">
        <div class="confirmed-check">✓</div>
        <h2>Payment Confirmed!</h2>
        <p>Thank you for your order. Your audio assets and legal license agreement have been sent to your email.</p>
        <div class="confirmed-order-id">
          Order Reference: <strong id="confirmed-id">EKO-0000</strong>
        </div>
        <div class="confirmed-actions">
          <button type="button" class="button button-primary cta-button" id="btn-view-confirmed-order">
            Track Order &amp; Downloads <span aria-hidden="true">›</span>
          </button>
          <button type="button" class="btn-outline-sm" id="btn-confirmed-back">
            Return to Studio
          </button>
        </div>
      </div>
    </div>
  `;

  const cartLayout = container.querySelector('#cart-layout');
  const itemsCountEl = container.querySelector('#cart-items-count');
  const itemsListEl = container.querySelector('#cart-items-list');
  const subtotalEl = container.querySelector('#sum-subtotal');
  const discountRowEl = container.querySelector('#sum-discount-row');
  const discountLabelEl = container.querySelector('#sum-discount-label');
  const discountEl = container.querySelector('#sum-discount');
  const totalEl = container.querySelector('#sum-total');
  const emptyState = container.querySelector('#cart-empty-state');
  const clearBtn = container.querySelector('#btn-clear-cart');
  const promoInput = container.querySelector('#promo-input');
  const applyPromoBtn = container.querySelector('#btn-apply-promo');
  const promoMsg = container.querySelector('#promo-msg');
  const checkoutForm = container.querySelector('#checkout-form');
  const checkoutConfirmed = container.querySelector('#checkout-confirmed');
  const confirmedId = container.querySelector('#confirmed-id');
  const btnViewConfirmedOrder = container.querySelector('#btn-view-confirmed-order');
  const btnConfirmedBack = container.querySelector('#btn-confirmed-back');
  const btnBrowseMore = container.querySelector('#btn-browse-more');
  const btnEmptyBeats = container.querySelector('#btn-empty-beats');
  const btnEmptySessions = container.querySelector('#btn-empty-sessions');

  function renderCart() {
    const items = cartStore.getItems();
    itemsCountEl.textContent = cartStore.getCount();

    if (items.length === 0) {
      cartLayout.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    cartLayout.style.display = 'grid';
    emptyState.style.display = 'none';

    itemsListEl.innerHTML = items.map(item => `
      <div class="cart-item-card" data-id="${item.id}" data-license="${item.license}">
        <div class="cart-item-info">
          <span class="cart-item-cat">${item.category || 'Audio'}</span>
          <h3 class="cart-item-title">${item.title}</h3>
          <span class="cart-item-tier">${item.license}</span>
        </div>
        <div class="cart-item-controls">
          <div class="qty-stepper">
            <button type="button" class="btn-qty btn-minus" aria-label="Decrease quantity">-</button>
            <span class="qty-num">${item.quantity || 1}</span>
            <button type="button" class="btn-qty btn-plus" aria-label="Increase quantity">+</button>
          </div>
          <div class="cart-item-price">$${item.price * (item.quantity || 1)}</div>
          <button type="button" class="btn-remove-cart-item" aria-label="Remove item">✕</button>
        </div>
      </div>
    `).join('');

    // Attach controls
    itemsListEl.querySelectorAll('.cart-item-card').forEach(card => {
      const id = card.dataset.id;
      const license = card.dataset.license;
      const minus = card.querySelector('.btn-minus');
      const plus = card.querySelector('.btn-plus');
      const remove = card.querySelector('.btn-remove-cart-item');
      const curItem = items.find(i => i.id === id && i.license === license);

      minus.addEventListener('click', () => {
        if (curItem) {
          cartStore.updateQuantity(id, license, (curItem.quantity || 1) - 1);
        }
      });

      plus.addEventListener('click', () => {
        if (curItem) {
          cartStore.updateQuantity(id, license, (curItem.quantity || 1) + 1);
        }
      });

      remove.addEventListener('click', () => {
        cartStore.removeItem(id, license);
      });
    });

    // Update numbers
    const rawSubtotal = cartStore.getTotal();
    subtotalEl.textContent = `$${rawSubtotal}`;

    if (discountRate > 0) {
      const discountAmt = Math.round(rawSubtotal * discountRate);
      const finalTotal = Math.max(0, rawSubtotal - discountAmt);
      discountRowEl.style.display = 'flex';
      discountLabelEl.textContent = `${Math.round(discountRate * 100)}% off`;
      discountEl.textContent = `-$${discountAmt}`;
      totalEl.textContent = `$${finalTotal}`;
    } else {
      discountRowEl.style.display = 'none';
      totalEl.textContent = `$${rawSubtotal}`;
    }
  }

  // Cart store subscription
  const unsubscribe = cartStore.subscribe(() => {
    renderCart();
  });

  clearBtn.addEventListener('click', () => {
    cartStore.clear();
  });

  applyPromoBtn.addEventListener('click', () => {
    const code = promoInput.value.trim().toUpperCase();
    if (code === 'STUDIO10' || code === 'FIRST10' || code === 'EKO10') {
      discountRate = 0.10;
      appliedPromoCode = code;
      promoMsg.style.color = '#00ffaa';
      promoMsg.textContent = `Promo code ${code} applied: 10% discount!`;
      renderCart();
    } else if (code) {
      promoMsg.style.color = '#ff6b6b';
      promoMsg.textContent = 'Invalid promo code. Try STUDIO10';
    }
  });

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const items = cartStore.getItems();
    if (items.length === 0) return;

    const formData = new FormData(checkoutForm);
    const buyerName = formData.get('buyer_name');
    const buyerEmail = formData.get('buyer_email');
    const payMethod = formData.get('payment_method');

    const totalAmt = discountRate > 0 
      ? Math.round(cartStore.getTotal() * (1 - discountRate))
      : cartStore.getTotal();

    // Create order in store
    const newOrd = ordersStore.addOrder({
      title: items.map(i => `${i.title} (${i.license})`).join(' + '),
      service: items[0].category || 'Beat License',
      client: buyerName,
      email: buyerEmail,
      amount: totalAmt,
      paymentMethod: payMethod,
      status: 'Delivered',
      currentStage: 5,
      downloadUrl: items[0].beatId ? './assets/showcase/broken jar mastered.mp3' : null,
      downloadName: `${items[0].title.replace(/\s+/g, '_')}_Master.mp3`,
      notes: `Payment completed via ${payMethod}. Stems & license agreement issued to ${buyerEmail}.`
    });

    cartStore.clear();

    confirmedId.textContent = newOrd.id;
    cartLayout.style.display = 'none';
    checkoutConfirmed.style.display = 'flex';

    btnViewConfirmedOrder.onclick = () => {
      checkoutConfirmed.style.display = 'none';
      navigateTo('orders');
    };

    btnConfirmedBack.onclick = () => {
      checkoutConfirmed.style.display = 'none';
      navigateTo('top');
    };
  });

  btnBrowseMore.addEventListener('click', () => navigateTo('beats'));
  btnEmptyBeats.addEventListener('click', () => navigateTo('beats'));
  btnEmptySessions.addEventListener('click', () => navigateTo('sessions'));

  container.onDestroy = () => {
    unsubscribe();
  };

  return container;
}
