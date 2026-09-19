/**
 * MINOZA ORDERS - PWA JAVASCRIPT CONTROLLER
 * Full Real-time Sync, iOS-style Audio Synthesis, Notifications & Dashboard CRUD
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const state = {
    orders: [],
    knownOrderIds: new Set(),
    isInitialLoad: true,
    soundEnabled: localStorage.getItem('minoza_sound_enabled') !== 'false',
    pollInterval: 5000,
    pollTimer: null,
    activeFilter: 'all',
    searchQuery: '',
    audioCtx: null,
    deferredInstallPrompt: null
  };

  // --------------------------------------------------------------------------
  // Web Audio Synthesis (iOS Chime & Tri-tone Generator)
  // --------------------------------------------------------------------------
  function initAudioContext() {
    if (!state.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        state.audioCtx = new AudioContextClass();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  // Play Apple iOS-style Tri-Tone or Ping Chime
  function playIosChime(type = 'tritone') {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!state.audioCtx) return;

    const ctx = state.audioCtx;
    const now = ctx.currentTime;

    if (type === 'ping') {
      // Crisp Single Ping Bell (E6 ~1318.5Hz harmonic bell)
      playTone(1318.5, now, 0.45, 0.25);
      playTone(2637.0, now, 0.35, 0.08);
    } else {
      // Iconic iOS Tri-Tone (Ding-Dang-Dong: G#5, B5, E6 ~ 830Hz, 987Hz, 1318Hz)
      playTone(830.6, now, 0.22, 0.25);
      playTone(987.8, now + 0.12, 0.22, 0.25);
      playTone(1318.5, now + 0.24, 0.45, 0.3);
    }
  }

  function playTone(freq, startTime, duration, maxGain) {
    if (!state.audioCtx) return;
    const ctx = state.audioCtx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle Apple-like bell envelope: quick attack, smooth exponential decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Unlock Audio on First User Interaction (Required by iOS Safari & Chrome)
  function setupAudioUnlock() {
    const unlockHandler = () => {
      initAudioContext();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
    };
    document.addEventListener('click', unlockHandler, { once: true });
    document.addEventListener('touchstart', unlockHandler, { once: true });
  }

  // --------------------------------------------------------------------------
  // Notifications (In-App iOS Dynamic Island + Web Notification API)
  // --------------------------------------------------------------------------
  async function requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        updateNotificationButtonState();
        return perm === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }

  function updateNotificationButtonState() {
    const btn = document.getElementById('btnToggleNotify');
    if (!btn) return;
    if (!('Notification' in window)) {
      btn.style.display = 'none';
      return;
    }
    if (Notification.permission === 'granted') {
      btn.classList.add('active');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span>การแจ้งเตือน: เปิด</span>
      `;
    } else {
      btn.classList.remove('active');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
        <span>เปิดการแจ้งเตือน</span>
      `;
    }
  }

  function triggerNewOrderAlert(order) {
    // 1. Play iOS Audio Chime
    playIosChime('tritone');

    // 2. Mobile Vibration Pattern
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 180]);
      } catch (e) {}
    }

    // 3. In-App iOS Banner (Apple Dynamic Island Animation)
    showIosBanner(order);

    // 4. System Web Notification (if permission granted or PWA)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const title = `มีคำสั่งซื้อใหม่ #${order.orderId}`;
        const body = `${order.customer?.name || 'ลูกค้า'} สั่งซื้อ ฿${(order.amount || 0).toLocaleString()} (${order.paymentMethod?.toUpperCase() || 'COD'})`;
        
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/images/logo_square_avatar.png',
              badge: '/images/logo_square_avatar.png',
              vibrate: [200, 100, 200],
              data: { url: '/orders' }
            });
          });
        } else {
          new Notification(title, {
            body,
            icon: '/images/logo_square_avatar.png'
          });
        }
      } catch (e) {
        console.warn('System notification error:', e);
      }
    }
  }

  function showIosBanner(order) {
    const banner = document.getElementById('iosNotificationBanner');
    if (!banner) return;

    const titleEl = document.getElementById('iosBannerTitle');
    const descEl = document.getElementById('iosBannerDesc');

    if (titleEl) {
      titleEl.textContent = `คำสั่งซื้อใหม่ #${order.orderId}`;
    }
    if (descEl) {
      const custName = order.customer?.name || 'ลูกค้า';
      const amt = (order.amount || 0).toLocaleString();
      descEl.innerHTML = `<span>${escapeHtml(custName)}</span> &bull; <span class="ios-banner-amount">฿${amt}</span>`;
    }

    banner.classList.add('visible');

    // Auto-hide after 5 seconds
    if (banner._timer) clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.classList.remove('visible');
    }, 5500);
  }

  // --------------------------------------------------------------------------
  // Data Fetching & Sync
  // --------------------------------------------------------------------------
  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      const incomingOrders = Array.isArray(data.orders) ? data.orders : [];

      // Detect any new orders that arrived after initial load
      if (!state.isInitialLoad) {
        const newlyArrived = incomingOrders.filter(o => !state.knownOrderIds.has(o.orderId));
        if (newlyArrived.length > 0) {
          // Play notification for the newest incoming order
          triggerNewOrderAlert(newlyArrived[0]);

          // Tag new orders for visual bounce animation
          newlyArrived.forEach(o => {
            o._isNew = true;
          });
        }
      }

      // Update known IDs
      state.knownOrderIds = new Set(incomingOrders.map(o => o.orderId));
      state.orders = incomingOrders;
      state.isInitialLoad = false;

      // Update UI
      renderMetrics();
      renderOrdersList();
      updateSyncTimestamp();

    } catch (err) {
      console.warn('Error fetching orders:', err);
      const syncEl = document.getElementById('syncTimeText');
      if (syncEl) syncEl.textContent = 'ขัดข้องชั่วคราว (จะลองใหม่ใน 5 วิ)';
    }
  }

  function updateSyncTimestamp() {
    const el = document.getElementById('syncTimeText');
    if (el) {
      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      el.textContent = `อัปเดตล่าสุด: ${timeStr}`;
    }
  }

  function startRealtimePolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(fetchOrders, state.pollInterval);
  }

  // --------------------------------------------------------------------------
  // UI Rendering
  // --------------------------------------------------------------------------
  function renderMetrics() {
    const totalOrders = state.orders.length;
    const totalRevenue = state.orders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Calculate today's orders (based on createdAt)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = state.orders.filter(o => {
      return o.createdAt && o.createdAt.startsWith(todayStr);
    });
    const todayCount = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Pending fulfillment / shipment
    const pendingOrders = state.orders.filter(o => {
      const st = (o.fulfillmentStatus || '').toUpperCase();
      return !st.includes('SHIPPED') && !st.includes('DELIVERED') && !st.includes('CANCEL');
    });

    const revEl = document.getElementById('metricRevenue');
    const ordersEl = document.getElementById('metricOrders');
    const todayEl = document.getElementById('metricToday');
    const pendingEl = document.getElementById('metricPending');

    if (revEl) revEl.textContent = `฿${totalRevenue.toLocaleString()}`;
    if (ordersEl) ordersEl.textContent = totalOrders.toLocaleString();
    if (todayEl) todayEl.textContent = `${todayCount} รายการ (฿${todayRevenue.toLocaleString()})`;
    if (pendingEl) pendingEl.textContent = `${pendingOrders.length} รายการ`;

    // Update filter counts
    updateFilterCounts();
  }

  function updateFilterCounts() {
    const countAll = state.orders.length;
    const countCod = state.orders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cod').length;
    const countPaid = state.orders.filter(o => (o.paymentStatus || '').toUpperCase() === 'PAID').length;
    const countPending = state.orders.filter(o => (o.paymentStatus || '').toUpperCase().includes('PENDING')).length;
    const countShipped = state.orders.filter(o => (o.fulfillmentStatus || '').toUpperCase().includes('SHIPPED')).length;

    setChipCount('chipAll', countAll);
    setChipCount('chipCod', countCod);
    setChipCount('chipPaid', countPaid);
    setChipCount('chipPending', countPending);
    setChipCount('chipShipped', countShipped);
  }

  function setChipCount(id, count) {
    const el = document.getElementById(id);
    if (el) {
      const badge = el.querySelector('.chip-count');
      if (badge) badge.textContent = count;
    }
  }

  function getFilteredOrders() {
    let list = [...state.orders];

    // Filter by tab
    if (state.activeFilter === 'cod') {
      list = list.filter(o => (o.paymentMethod || '').toLowerCase() === 'cod');
    } else if (state.activeFilter === 'paid') {
      list = list.filter(o => (o.paymentStatus || '').toUpperCase() === 'PAID');
    } else if (state.activeFilter === 'pending') {
      list = list.filter(o => (o.paymentStatus || '').toUpperCase().includes('PENDING'));
    } else if (state.activeFilter === 'shipped') {
      list = list.filter(o => (o.fulfillmentStatus || '').toUpperCase().includes('SHIPPED'));
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(o => {
        const idMatch = (o.orderId || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.phone || '').toLowerCase().includes(q);
        const trackMatch = (o.trackingNumber || '').toLowerCase().includes(q);
        const addrMatch = (o.customer?.address || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || trackMatch || addrMatch;
      });
    }

    return list;
  }

  function renderOrdersList() {
    const container = document.getElementById('ordersListContainer');
    const countBadge = document.getElementById('ordersCountBadge');
    if (!container) return;

    const filtered = getFilteredOrders();
    if (countBadge) countBadge.textContent = `${filtered.length} รายการ`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">ไม่พบรายการคำสั่งซื้อ</h3>
          <p class="empty-state-desc">ยังไม่มีคำสั่งซื้อที่ตรงกับเงื่อนไขในขณะนี้</p>
          <button type="button" class="btn-icon-pill" onclick="window.MinozaOrders.simulateOrder()">
            <span>สร้างคำสั่งซื้อทดสอบ</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => renderOrderCard(order)).join('');
  }

  function renderOrderCard(order) {
    const orderId = escapeHtml(order.orderId || '-');
    const createdAt = order.createdAt ? formatDateTime(order.createdAt) : '-';
    const custName = escapeHtml(order.customer?.name || 'ไม่ระบุชื่อ');
    const custPhone = escapeHtml(order.customer?.phone || '');
    const custAddr = escapeHtml(order.customer?.address || '-');
    const amount = (order.amount || 0).toLocaleString();
    const tracking = escapeHtml(order.trackingNumber || '');
    const isNewClass = order._isNew ? 'is-new-highlight' : '';

    // Payment & Status Badges (Clean subdued badges, no emojis)
    const isCod = (order.paymentMethod || '').toLowerCase() === 'cod';
    const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID';
    const isShipped = (order.fulfillmentStatus || '').toUpperCase().includes('SHIPPED');

    let paymentBadge = `<span class="status-badge badge-cod">เก็บเงินปลายทาง (COD)</span>`;
    if (!isCod) {
      paymentBadge = `<span class="status-badge badge-paid">โอนเงิน / PromptPay</span>`;
    }

    let statusBadge = isPaid
      ? `<span class="status-badge badge-paid">ชำระแล้ว</span>`
      : `<span class="status-badge badge-pending">รอชำระเงิน</span>`;

    let fulfillmentBadge = isShipped
      ? `<span class="status-badge badge-shipped">จัดส่งแล้ว</span>`
      : `<span class="status-badge badge-pending">รอจัดส่ง</span>`;

    // Items list
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.map(item => `
      <li class="item-row">
        <span>${escapeHtml(item.name || 'สินค้า')}</span>
        <span class="item-qty-tag">x${item.quantity || 1} &bull; ฿${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
      </li>
    `).join('');

    return `
      <article class="order-card ${isNewClass}" id="card-${orderId}">
        <!-- Top Meta Row -->
        <div class="order-card-top">
          <div class="order-id-group">
            <span class="order-id-tag">#${orderId}</span>
            <span class="order-time">${createdAt}</span>
          </div>
          <div class="order-badges">
            ${paymentBadge}
            ${statusBadge}
            ${fulfillmentBadge}
          </div>
        </div>

        <!-- Body Details -->
        <div class="order-card-body">
          <!-- Col 1: Customer Details -->
          <div>
            <div class="info-block-title">ผู้สั่งซื้อ</div>
            <div class="customer-name">${custName}</div>
            ${custPhone ? `
              <div class="customer-phone-row">
                <span class="customer-phone">${custPhone}</span>
                <a href="tel:${custPhone}" class="btn-call-customer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>โทร</span>
                </a>
              </div>
            ` : '<span style="color:#64748b; font-size:12px;">ไม่มีเบอร์โทร</span>'}
          </div>

          <!-- Col 2: Shipping Address -->
          <div>
            <div class="info-block-title">ที่อยู่จัดส่งพัสดุ</div>
            <div class="address-box">
              <div id="addr-text-${orderId}">${custName} | ${custPhone}<br/>${custAddr}</div>
              <button type="button" class="btn-copy-address" onclick="window.MinozaOrders.copyAddress('${orderId}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>คัดลอกที่อยู่</span>
              </button>
            </div>
          </div>

          <!-- Col 3: Items & Amount -->
          <div>
            <div class="info-block-title">รายการสินค้า</div>
            <ul class="items-summary-list">
              ${itemsHtml || '<li class="item-row"><span>ไม่มีรายละเอียดสินค้า</span></li>'}
            </ul>
            <div class="order-total-price">
              <span class="total-label">ยอดสุทธิ</span>
              <span class="price-val">฿${amount}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div class="order-card-bottom">
          <!-- Tracking Input -->
          <div class="tracking-input-group">
            <input type="text" class="tracking-input" id="track-${orderId}" 
                   placeholder="กรอกเลขพัสดุ (Flash / Kerry / EMS)" value="${tracking}" />
            <button type="button" class="btn-save-tracking" onclick="window.MinozaOrders.saveTracking('${orderId}')">
              บันทึกเลขพัสดุ
            </button>
          </div>

          <!-- Status Select & Actions -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <select class="status-select" id="status-${orderId}" onchange="window.MinozaOrders.updateOrderStatus('${orderId}', this.value)">
              <option value="PENDING_SHIPMENT" ${!isShipped ? 'selected' : ''}>รอจัดส่ง (Pending)</option>
              <option value="SHIPPED" ${isShipped ? 'selected' : ''}>จัดส่งแล้ว (Shipped)</option>
              <option value="PAID" ${isPaid ? 'selected' : ''}>ชำระแล้ว (Paid)</option>
              <option value="CANCELLED">ยกเลิก (Cancelled)</option>
            </select>
            <button type="button" class="btn-action-delete" title="ลบออเดอร์" onclick="window.MinozaOrders.deleteOrder('${orderId}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>ลบ</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // --------------------------------------------------------------------------
  // User Actions (Copy, Save, Delete, Simulate)
  // --------------------------------------------------------------------------
  async function copyAddress(orderId) {
    const addrEl = document.getElementById(`addr-text-${orderId}`);
    if (!addrEl) return;

    const textToCopy = addrEl.innerText.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
      const btn = event?.currentTarget;
      if (btn) {
        const origText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<span>✓ คัดลอกแล้ว! พร้อมวาง</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = origText;
        }, 2000);
      }
    } catch (err) {
      alert('ไม่สามารถคัดลอกได้อัตโนมัติ: ' + textToCopy);
    }
  }

  async function saveTracking(orderId) {
    const input = document.getElementById(`track-${orderId}`);
    if (!input) return;
    const trackingNumber = input.value.trim();

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber,
          fulfillmentStatus: trackingNumber ? 'DISPATCHED_TO_FLASH_EXPRESS' : 'PENDING_SHIPMENT'
        })
      });
      if (!res.ok) throw new Error('Update failed');
      
      showToast(`บันทึกเลขพัสดุ #${orderId} เรียบร้อย`);
      await fetchOrders();
    } catch (e) {
      alert('บันทึกเลขพัสดุล้มเหลว: ' + e.message);
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const patch = {};
      if (newStatus === 'SHIPPED') {
        patch.fulfillmentStatus = 'DISPATCHED_TO_FLASH_EXPRESS';
      } else if (newStatus === 'PENDING_SHIPMENT') {
        patch.fulfillmentStatus = 'PENDING_SHIPMENT';
      } else if (newStatus === 'PAID') {
        patch.paymentStatus = 'PAID';
      } else if (newStatus === 'CANCELLED') {
        patch.paymentStatus = 'CANCELLED';
        patch.fulfillmentStatus = 'CANCELLED';
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Status update failed');

      showToast(`อัปเดตสถานะ #${orderId} เรียบร้อย`);
      await fetchOrders();
    } catch (e) {
      alert('อัปเดตสถานะล้มเหลว: ' + e.message);
    }
  }

  async function deleteOrder(orderId) {
    if (!confirm(`ต้องการลบคำสั่งซื้อ #${orderId} ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');

      state.knownOrderIds.delete(orderId);
      showToast(`ลบคำสั่งซื้อ #${orderId} สำเร็จ`);
      await fetchOrders();
    } catch (e) {
      alert('ลบคำสั่งซื้อไม่สำเร็จ: ' + e.message);
    }
  }

  async function simulateOrder() {
    try {
      initAudioContext();
      const res = await fetch('/api/orders/mock-test', { method: 'POST' });
      if (!res.ok) throw new Error('Simulation failed');
      const data = await res.json();
      
      // Instantly refresh orders list to trigger chime & animation
      await fetchOrders();
    } catch (e) {
      alert('ไม่สามารถจำลองออเดอร์ได้: ' + e.message);
    }
  }

  async function resetOrders() {
    if (!confirm('คำเตือน: คุณต้องการรีเซ็ตคำสั่งซื้อทั้งหมดกลับเป็น 0 ใช่หรือไม่?')) return;
    try {
      const res = await fetch('/api/orders/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      state.knownOrderIds.clear();
      showToast('รีเซ็ตคำสั่งซื้อเรียบร้อย');
      await fetchOrders();
    } catch (e) {
      alert('รีเซ็ตไม่สำเร็จ: ' + e.message);
    }
  }

  function toggleSound() {
    initAudioContext();
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('minoza_sound_enabled', state.soundEnabled ? 'true' : 'false');
    updateSoundButtonState();

    if (state.soundEnabled) {
      playIosChime('tritone');
      showToast('เปิดเสียงแจ้งเตือนแล้ว');
    } else {
      showToast('ปิดเสียงแจ้งเตือนแล้ว');
    }
  }

  function updateSoundButtonState() {
    const btn = document.getElementById('btnToggleSound');
    if (!btn) return;
    if (state.soundEnabled) {
      btn.classList.add('active');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <span>เสียงเตือน: เปิด</span>
      `;
    } else {
      btn.classList.remove('active');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
        <span>เสียงเตือน: ปิด</span>
      `;
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 99999;
      animation: fadeIn 0.2s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // --------------------------------------------------------------------------
  // PWA Installation Handlers
  // --------------------------------------------------------------------------
  function setupPwa() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
          .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
      });
    }

    // 2. Before Install Prompt (Chrome / Android / Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstallPrompt = e;
      const bar = document.getElementById('installPwaBar');
      if (bar) bar.classList.add('active');
    });

    // 3. Detect iOS Safari to show Add to Home Screen Hint
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
      const bar = document.getElementById('installPwaBar');
      if (bar) {
        bar.classList.add('active');
        const btn = document.getElementById('btnInstallApp');
        if (btn) {
          btn.textContent = 'วิธีติดตั้งบน iPhone';
          btn.onclick = () => showIosModal(true);
        }
      }
    }
  }

  function handleInstallClick() {
    if (state.deferredInstallPrompt) {
      state.deferredInstallPrompt.prompt();
      state.deferredInstallPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          const bar = document.getElementById('installPwaBar');
          if (bar) bar.classList.remove('active');
        }
        state.deferredInstallPrompt = null;
      });
    } else {
      showIosModal(true);
    }
  }

  function showIosModal(show) {
    const modal = document.getElementById('iosModal');
    if (modal) {
      if (show) modal.classList.add('active');
      else modal.classList.remove('active');
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(isoStr) {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  function init() {
    setupAudioUnlock();
    updateSoundButtonState();
    updateNotificationButtonState();
    setupPwa();

    // Event Listeners for Filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        state.activeFilter = target.dataset.filter || 'all';
        renderOrdersList();
      });
    });

    // Event Listener for Search
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderOrdersList();
      });
    }

    // Initial Fetch & Start Polling
    fetchOrders();
    startRealtimePolling();
  }

  // Export to Global Scope for HTML Event Handlers
  window.MinozaOrders = {
    playIosChime,
    toggleSound,
    requestNotificationPermission,
    copyAddress,
    saveTracking,
    updateOrderStatus,
    deleteOrder,
    simulateOrder,
    resetOrders,
    handleInstallClick,
    showIosModal,
    refresh: fetchOrders
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
