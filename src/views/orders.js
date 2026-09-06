import { ordersStore } from '../store/ordersStore.js';

export function createOrdersView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page orders-view';
  container.id = 'orders-view-content';

  let currentSearchQuery = '';

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Live Order Tracking &amp; Delivery Vault</div>
      <h1 class="view-title">Project &amp; Order Status</h1>
      <p class="view-subtitle">Track the production progress of your mix, master, beat lease, or stem delivery. Look up by your Order ID or registered email address.</p>
    </div>

    <!-- Search / Lookup Bar -->
    <div class="orders-lookup-bar">
      <div class="lookup-input-wrap">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
        <input type="text" id="order-search-input" placeholder="Enter Order ID (e.g. EKO-9421) or your email...">
      </div>
      <button type="button" class="btn-primary-sm" id="btn-search-orders">Find Order</button>
    </div>

    <!-- Active Orders List -->
    <div class="orders-content" id="orders-content"></div>

    <!-- Studio Delivery Policy -->
    <div class="orders-support-footer">
      <div class="support-card">
        <h3>Need revisions or additional formats?</h3>
        <p>All mixing &amp; mastering packages include 2 free revision cycles. Need an instrumental bounce, acapella stem, or TV mix? Send a message with your Order ID.</p>
        <div class="support-actions">
          <a href="#contact" class="btn-outline-sm" id="btn-order-contact">Contact Studio Support</a>
        </div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#order-search-input');
  const searchBtn = container.querySelector('#btn-search-orders');
  const ordersContent = container.querySelector('#orders-content');
  const btnOrderContact = container.querySelector('#btn-order-contact');

  function renderOrders(filterQuery = '') {
    const allOrders = ordersStore.getOrders();
    const query = filterQuery.trim().toLowerCase();

    let list = allOrders;
    if (query) {
      list = allOrders.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.email.toLowerCase().includes(query) ||
        o.client.toLowerCase().includes(query) ||
        o.title.toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      ordersContent.innerHTML = `
        <div class="empty-state">
          <p>No orders found matching "<strong>${filterQuery}</strong>". Check your order confirmation email or try searching by email.</p>
        </div>
      `;
      return;
    }

    ordersContent.innerHTML = list.map(order => {
      const isDelivered = order.status === 'Delivered';
      return `
        <article class="order-card" id="order-${order.id}">
          <div class="order-card-header">
            <div>
              <div class="order-id-badge">${order.id}</div>
              <h2 class="order-title">${order.title}</h2>
              <span class="order-client">Client: <strong>${order.client}</strong> (${order.email}) · Placed ${order.date}</span>
            </div>
            <div class="order-status-badge ${isDelivered ? 'status-delivered' : 'status-progress'}">
              ${isDelivered ? '✓ Delivered &amp; Ready' : '⚙ In Production'}
            </div>
          </div>

          <!-- Progress Stepper -->
          <div class="order-stepper">
            ${(order.timeline || []).map((step, idx) => `
              <div class="step-item ${step.done ? 'step-done' : (step.active ? 'step-active' : 'step-pending')}">
                <div class="step-circle">
                  ${step.done ? '✓' : (idx + 1)}
                </div>
                <div class="step-info">
                  <strong class="step-label">${step.title}</strong>
                  <span class="step-time">${step.time}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Notes & Downloads -->
          <div class="order-details-box">
            <div class="order-notes-col">
              <h4>Engineer Notes:</h4>
              <p>${order.notes || 'Project is proceeding according to timeline specifications.'}</p>
            </div>
            <div class="order-action-col">
              ${isDelivered && order.downloadUrl ? `
                <a href="${order.downloadUrl}" download="${order.downloadName || 'Eko_Master.mp3'}" class="btn-download-order">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download Master Files
                </a>
                <button type="button" class="btn-outline-sm btn-view-cert" data-order="${order.id}">
                  License Certificate
                </button>
              ` : `
                <div class="in-prod-indicator">
                  <div class="pulse-dot"></div>
                  <span>Workstation active · Notification will be emailed</span>
                </div>
              `}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach certificate click
    ordersContent.querySelectorAll('.btn-view-cert').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.order;
        const ord = allOrders.find(o => o.id === orderId);
        if (ord) {
          alert(`License Certificate #${ord.id}\nIssued to: ${ord.client}\nWork: ${ord.title}\nTerms: Fully cleared for commercial broadcast & streaming. Issued by Eko Audio Studios.`);
        }
      });
    });
  }

  function doSearch() {
    currentSearchQuery = searchInput.value;
    renderOrders(currentSearchQuery);
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  searchInput.addEventListener('input', () => {
    if (!searchInput.value) {
      renderOrders('');
    }
  });

  if (btnOrderContact) {
    btnOrderContact.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('contact');
    });
  }

  renderOrders();
  return container;
}
