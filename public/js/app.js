/**
 * Minoza Series - Client App & Product Routing Engine
 * Supports dedicated product URLs (/product/magfold-3in1, /product/halo-desk-lamp, etc.)
 */

window.MinozaStore = {
  products: [],
  cart: [],
  selectedHeroBundle: 2, // 2 = Bundle 2 (Popular), 1 = Single unit
  currentProduct: null,

  init: async function () {
    await this.fetchProducts();
    this.resolveCurrentProductFromUrl();
    this.renderHeroProduct();
    this.renderCatalog();
    this.updateCheckoutSummary();

    // Track ViewContent on current product
    if (this.currentProduct) {
      window.MinozaTracking.track('ViewContent', {
        content_name: this.currentProduct.name,
        content_category: this.currentProduct.category,
        content_ids: [this.currentProduct.id],
        content_type: 'product',
        value: this.currentProduct.price,
        currency: 'THB'
      });
    }
  },

  fetchProducts: async function () {
    try {
      const res = await fetch('/api/products');
      this.products = await res.json();
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  },

  // Resolve product from URL path or query params
  resolveCurrentProductFromUrl: function () {
    let slug = null;
    const path = window.location.pathname;

    if (path.includes('/product/')) {
      const parts = path.split('/product/');
      if (parts[1]) slug = parts[1].replace(/\/$/, '');
    } else {
      const params = new URLSearchParams(window.location.search);
      slug = params.get('product');
    }

    if (slug) {
      this.currentProduct = this.products.find(p => p.id === slug || p.slug === slug);
    }

    // Default to Cross Bracelet if not found
    if (!this.currentProduct) {
      this.currentProduct = this.products.find(p => p.id === 'cross-bracelet') || this.products[0];
    }
  },

  // Render the Hero Product Section dynamically (Forte Series Layout)
  renderHeroProduct: function () {
    const p = this.currentProduct;
    if (!p) return;

    // 1. Update Title & Editorial Description
    const titleElem = document.getElementById('productTitle');
    if (titleElem) titleElem.textContent = p.name;

    const descElems = document.querySelectorAll('.forte-description');
    if (descElems.length >= 2) {
      descElems[0].textContent = p.tagline;
      descElems[1].textContent = p.description;
    }

    // 2. Update Gallery & Thumbnails
    const mainImg = document.getElementById('mainProductPhoto');
    if (mainImg) mainImg.src = p.image;

    const thumbStrip = document.getElementById('thumbStrip');
    if (thumbStrip && p.gallery && p.gallery.length) {
      thumbStrip.innerHTML = p.gallery.map((imgSrc, idx) => `
        <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchProductImage('${imgSrc}', this)">
          <img src="${imgSrc}" alt="${p.shortName || p.name}" />
        </div>
      `).join('');
    }

    // 3. Update Option Cards (Bundle & Single)
    const opt1 = document.getElementById('optBundle1');
    const opt2 = document.getElementById('optBundle2');

    if (opt1) {
      opt1.querySelector('.card-title-text').textContent = `${p.bundle1Title || 'ซื้อ 1 ชิ้นเดี่ยว'} (${p.price.toLocaleString()} ฿)`;
    }

    if (opt2) {
      opt2.querySelector('.card-title-text').textContent = p.bundle2Title || 'เซ็ตสุดคุ้ม 2 ชิ้น (Popular)';
      const bulletsList = opt2.querySelector('.card-bullet-points');
      if (bulletsList && p.bundle2Bullets) {
        bulletsList.innerHTML = p.bundle2Bullets.map(b => `<li>${b}</li>`).join('');
      }
    }

    // 4. Update Price & CTA Button
    this.updatePriceDisplay();
  },

  updatePriceDisplay: function () {
    const p = this.currentProduct;
    if (!p) return;

    const priceElem = document.getElementById('displayBigPrice');
    const btnText = document.getElementById('btnForteText');

    const finalPrice = (this.selectedHeroBundle === 2) ? p.bundle2Price : p.price;

    if (priceElem) priceElem.textContent = `${finalPrice.toLocaleString()} ฿`;
    if (btnText) btnText.textContent = `Add To Cart - ${finalPrice.toLocaleString()} ฿`;
  },

  // Render Multi-Product Catalog Grid
  renderCatalog: function () {
    const grid = document.getElementById('bestsellersGrid') || document.getElementById('catalogGrid');
    if (!grid || !this.products.length) return;

    const isThai = (localStorage.getItem('minozastore_lang') || 'th') === 'th';

    grid.innerHTML = this.products.map(p => {
      const isSoldOut = Boolean(p.isSoldOut);
      const badgePill = isSoldOut
        ? `<span class="sava-badge-pill" style="background: #dc2626; color: #fff; border: 1px solid #b91c1c;">SOLD OUT</span>`
        : `<span class="sava-badge-pill">${p.badge || 'BESTSELLER'}</span>`;

      const origPriceHtml = p.originalPrice
        ? `<span class="orig-price" data-thb="${Number(p.originalPrice).toLocaleString()} ฿">${Number(p.originalPrice).toLocaleString()} ฿</span>`
        : '';

      const quickAddBtn = isSoldOut
        ? `<button type="button" class="sava-quick-add-btn" disabled style="background: #94a3b8; color: #fff; cursor: not-allowed; opacity: 0.85;">สินค้าหมด</button>`
        : `<button type="button" class="sava-quick-add-btn" data-i18n="quickAdd" onclick="event.preventDefault(); window.MinozaStore.addToCart('${p.id}')">${isThai ? 'ใส่ตะกร้า +' : 'Add to Bag +'}</button>`;

      const soldOverlay = isSoldOut
        ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 13.5px; letter-spacing: 0.05em; z-index: 2; pointer-events: none;">สินค้าหมดชั่วคราว</div>`
        : '';

      const mainImg = p.image || '/images/jewelry/cross_chain_main.jpg';

      return `
        <div class="sava-product-card ${isSoldOut ? 'product-sold-out' : ''}" id="card-${p.id}">
          <a href="/product/${p.slug || p.id}" class="sava-card-media" style="position: relative; display: block; overflow: hidden;">
            ${badgePill}
            ${soldOverlay}
            <img src="${mainImg}" class="img-primary" alt="${p.name}" loading="lazy" onerror="this.src='/images/jewelry/cross_chain_main.jpg'" style="${isSoldOut ? 'filter: grayscale(40%);' : ''}" />
            ${p.hoverImage ? `<img src="${p.hoverImage}" class="img-hover" alt="${p.name} Hover" loading="lazy" onerror="this.style.display='none'" />` : ''}
            ${quickAddBtn}
          </a>
          <div class="sava-card-body">
            <div class="sava-card-rating">
              <span class="stars">★★★★★</span>
              <span>(${p.reviewCount || 120})</span>
            </div>
            <h3 class="sava-card-title"><a href="/product/${p.slug || p.id}">${p.name}</a></h3>
            <div class="sava-card-pricing">
              ${origPriceHtml}
              <span class="sale-price" data-thb="${Number(p.price).toLocaleString()} ฿">${Number(p.price).toLocaleString()} ฿</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Cart Logic with In-Cart Upsell & BOGO (Buy 1 Get 1 Free) Promotion
  upsellOffset: 0,

  calculateCartTotals: function () {
    let rawSubtotal = 0;
    let rawOriginal = 0;
    let bundleDiscount = 0;
    let totalCount = 0;
    const individualItems = [];

    this.cart.forEach(item => {
      const q = item.quantity || 1;
      totalCount += q;
      if (item.isBundle) {
        rawSubtotal += (item.price * q);
        rawOriginal += ((item.originalPrice || item.price * 1.35) * q);
        bundleDiscount += (((item.originalPrice || item.price) - item.price) * q);
      } else {
        for (let i = 0; i < q; i++) {
          individualItems.push({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            originalPrice: Number(item.originalPrice || Math.round(item.price * 1.25))
          });
        }
      }
    });

    let bogoDiscount = 0;
    if (individualItems.length > 0) {
      individualItems.sort((a, b) => b.price - a.price);
      for (let i = 1; i < individualItems.length; i += 2) {
        bogoDiscount += individualItems[i].price;
      }
      const indivSubtotal = individualItems.reduce((sum, x) => sum + x.price, 0);
      const indivOriginal = individualItems.reduce((sum, x) => sum + x.originalPrice, 0);
      rawSubtotal += indivSubtotal;
      rawOriginal += indivOriginal;
    }

    const totalDiscount = bundleDiscount + bogoDiscount;
    const totalDue = Math.max(0, rawSubtotal - bogoDiscount);

    return {
      totalCount,
      rawSubtotal,
      rawOriginal,
      discount: totalDiscount,
      totalDue
    };
  },

  addHeroToCart: function () {
    const p = this.currentProduct;
    if (!p) return;

    const isBogo = (this.selectedHeroBundle === 2);
    const qtyToAdd = isBogo ? 2 : 1;
    const title = p.name;

    const existing = this.cart.find(item => item.id === p.id);
    if (existing) {
      existing.quantity += qtyToAdd;
    } else {
      this.cart.push({
        id: p.id,
        name: title,
        price: p.price,
        originalPrice: p.originalPrice || Math.round(p.price * 1.25),
        image: p.image,
        quantity: qtyToAdd
      });
    }

    this.updateCartUI();
    this.updateCheckoutSummary();
    this.openCartDrawer();

    window.MinozaTracking.track('AddToCart', {
      content_name: title,
      content_ids: [p.id],
      content_type: 'product',
      value: p.price * qtyToAdd,
      currency: 'THB'
    });
  },

  addToCart: function (productId, qty = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    if (product.isSoldOut) {
      alert('ขออภัย สินค้ารายการนี้หมดชั่วคราวครับ (This product is currently out of stock)');
      return;
    }

    const existing = this.cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.cart.push({
        id: product.id,
        name: product.shortName || product.name,
        price: product.price,
        originalPrice: product.originalPrice || Math.round(product.price * 1.25),
        image: product.image,
        quantity: qty
      });
    }

    this.updateCartUI();
    this.updateCheckoutSummary();
    this.openCartDrawer();

    window.MinozaTracking.track('AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price * qty,
      currency: 'THB'
    });
  },

  removeFromCart: function (productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    this.updateCartUI();
    this.updateCheckoutSummary();
  },

  updateCartQty: function (productId, delta) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId);
    } else {
      this.updateCartUI();
      this.updateCheckoutSummary();
    }
  },

  shiftUpsell: function (dir) {
    this.upsellOffset = Math.max(0, this.upsellOffset + dir);
    this.renderUpsellTrack();
  },

  renderUpsellTrack: function () {
    const track = document.getElementById('upsellTrack');
    if (!track) return;

    // Filter products not in cart and not sold out
    const cartIds = this.cart.map(c => c.id);
    const availableUpsells = this.products.filter(p => !cartIds.includes(p.id) && !p.isSoldOut);

    if (!availableUpsells.length) {
      document.getElementById('cartUpsellSection').style.display = 'none';
      return;
    }
    document.getElementById('cartUpsellSection').style.display = 'block';

    const displayItems = availableUpsells.slice(this.upsellOffset, this.upsellOffset + 3);
    if (!displayItems.length && availableUpsells.length > 0) {
      this.upsellOffset = 0;
      return this.renderUpsellTrack();
    }

    track.innerHTML = displayItems.map(p => `
      <div class="upsell-item-card">
        <div class="upsell-img-wrap">
          <img src="${p.image}" alt="${p.shortName || p.name}" />
          <button class="upsell-quick-add-btn" onclick="window.MinozaStore.addToCart('${p.id}')" title="Add to cart">+</button>
        </div>
        <div class="upsell-item-name">${p.shortName || p.name}</div>
        <div class="upsell-item-price">${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
      </div>
    `).join('');
  },

  updateCartUI: function () {
    const badge = document.getElementById('cartBadge');
    const drawerCount = document.getElementById('cartDrawerCount');
    const drawerBody = document.getElementById('cartItemsList') || document.getElementById('cartDrawerBody');
    const drawerTotal = document.getElementById('cartDrawerTotal');
    const drawerStrike = document.getElementById('cartDrawerOriginal') || document.getElementById('cartDrawerStrike');
    const progressFill = document.getElementById('bogoProgressFill') || document.getElementById('cartProgressFill');
    const progressText = document.getElementById('bogoBannerText') || document.getElementById('cartProgressText');
    const bogoSavingsRow = document.getElementById('bogoSavingsRow');
    const bogoSavingsAmount = document.getElementById('cartDrawerSavings');

    const totals = this.calculateCartTotals();
    if (badge) badge.textContent = totals.totalCount;
    if (drawerCount) drawerCount.textContent = totals.totalCount;

    // Render Upsell Carousel
    this.renderUpsellTrack();

    if (!this.cart.length) {
      if (drawerBody) {
        drawerBody.innerHTML = `
          <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🛒</div>
            <p style="font-size: 0.9rem; font-weight: 600;">YOUR BAG IS CURRENTLY EMPTY</p>
          </div>
        `;
      }
      if (drawerTotal) drawerTotal.textContent = '0 ฿';
      const isThai = (localStorage.getItem('minozastore_lang') || 'th') === 'th';
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = isThai ? '🎁 เพิ่มสินค้าอีก 1 ชิ้น เพื่อรับสิทธิ์ ซื้อ 1 แถม 1 ฟรีทันที!' : 'ADD 1 ITEM & GET ONE FREE';
      if (bogoSavingsRow) bogoSavingsRow.style.display = 'none';
      return;
    }

    // Dynamic SAVA BOGO Progress Tracker
    const isThai = (localStorage.getItem('minozastore_lang') || 'th') === 'th';
    const hasBundle = this.cart.some(item => item.isBundle);
    if (hasBundle || totals.totalCount >= 2) {
      if (progressFill) progressFill.style.width = '100%';
      if (progressText) {
        progressText.textContent = isThai 
          ? '🎉 ได้รับสิทธิ์ ซื้อ 1 แถม 1 ฟรีเรียบร้อยแล้ว!' 
          : '🎉 BUY 1 GET 1 FREE UNLOCKED!';
      }
    } else {
      if (progressFill) progressFill.style.width = '50%';
      if (progressText) {
        progressText.textContent = isThai 
          ? '🎁 เพิ่มสินค้าอีก 1 ชิ้น เพื่อรับสิทธิ์ ซื้อ 1 แถม 1 ฟรีทันที!' 
          : '🎁 ADD 1 MORE ITEM TO UNLOCK BUY 1 GET 1 FREE!';
      }
    }

    if (drawerTotal) drawerTotal.textContent = `${totals.totalDue.toLocaleString()} ฿`;
    if (drawerStrike) drawerStrike.textContent = `${totals.rawOriginal.toLocaleString()} ฿`;

    if (bogoSavingsRow && bogoSavingsAmount) {
      if (totals.discount > 0) {
        bogoSavingsRow.style.display = 'flex';
        bogoSavingsAmount.textContent = `-${totals.discount.toLocaleString()} ฿ (FREE)`;
      } else {
        bogoSavingsRow.style.display = 'none';
      }
    }

    // Render Cart Items
    if (drawerBody) {
      drawerBody.innerHTML = this.cart.map(item => `
        <div class="cart-single-item">
          <div class="cart-item-thumbnail">
            <img src="${item.image}" alt="${item.name}" />
          </div>
          <div class="cart-item-details">
            <div class="cart-item-title-row">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-pricing">
                <span class="price-current">${(item.price * item.quantity).toLocaleString()} ฿</span>
                <span class="price-original">${((item.originalPrice || item.price * 1.25) * item.quantity).toLocaleString()} ฿</span>
              </div>
            </div>
            <div class="cart-item-actions-row">
              <div class="qty-stepper">
                <button type="button" onclick="window.MinozaStore.updateCartQty('${item.id}', -1)">—</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="window.MinozaStore.updateCartQty('${item.id}', 1)">+</button>
              </div>
              <button type="button" class="btn-remove-item" onclick="window.MinozaStore.removeFromCart('${item.id}')">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  },

  openCartDrawer: function () {
    document.getElementById('cartOverlay')?.classList.add('active');
    document.getElementById('cartDrawerOverlay')?.classList.add('active');
    document.getElementById('cartDrawer')?.classList.add('active');
  },

  closeCartDrawer: function () {
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.getElementById('cartDrawerOverlay')?.classList.remove('active');
    document.getElementById('cartDrawer')?.classList.remove('active');
  },

  quickBuy: function (productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    this.cart = [{
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    }];
    this.updateCartUI();
    this.updateCheckoutSummary();
    this.scrollToCheckout();
  },

  scrollToCheckout: function () {
    this.closeCartDrawer();
    this.updateCheckoutSummary();
    const elem = document.getElementById('checkoutSection');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }

    const totals = this.calculateCartTotals();
    window.MinozaTracking.track('InitiateCheckout', {
      value: totals.totalDue,
      currency: 'THB',
      num_items: totals.totalCount
    });
  },

  getCurrentCheckoutItems: function () {
    if (this.cart.length > 0) {
      return this.cart;
    }
    const p = this.currentProduct;
    if (!p) return [];

    let price = p.price;
    let title = p.name;
    let qty = (this.selectedHeroBundle === 2) ? 2 : 1;

    return [{
      id: p.id,
      name: title,
      price: price,
      image: p.image,
      quantity: qty
    }];
  },

  updateCheckoutSummary: function () {
    const container = document.getElementById('checkoutItemsList');
    const totalElem = document.getElementById('checkoutTotalPrice');
    const subtotalElem = document.getElementById('checkoutSubtotal');
    const savingsRow = document.getElementById('checkoutSavingsRow');
    const savingsElem = document.getElementById('checkoutSavings');
    if (!container || !totalElem) return;

    const items = this.getCurrentCheckoutItems();
    if (!items.length) {
      container.innerHTML = `<div style="color: #71717a; font-size: 0.88rem; padding: 12px 0;">ไม่มีสินค้าในตะกร้า</div>`;
      if (totalElem) totalElem.textContent = '0 ฿';
      if (subtotalElem) subtotalElem.textContent = '0 ฿';
      if (savingsRow) savingsRow.style.display = 'none';
      return;
    }

    const totals = this.calculateCartTotals();

    container.innerHTML = items.map(i => `
      <div class="summary-item-clean">
        <img src="${i.image}" alt="${i.name}" />
        <div style="flex-grow: 1;">
          <div class="name">${i.name}</div>
          <div style="font-size: 0.78rem; color: #71717a;">Qty: ${i.quantity}</div>
        </div>
        <div class="price">${(i.price * i.quantity).toLocaleString()} ฿</div>
      </div>
    `).join('');

    if (subtotalElem) subtotalElem.textContent = `${totals.rawSubtotal.toLocaleString()} ฿`;
    if (savingsRow) {
      if (totals.discount > 0) {
        savingsRow.style.display = 'flex';
        if (savingsElem) savingsElem.textContent = `-${totals.discount.toLocaleString()} ฿ (Buy 1 Get 1 Free)`;
      } else {
        savingsRow.style.display = 'none';
      }
    }
    totalElem.textContent = `${totals.totalDue.toLocaleString()} ฿`;
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.MinozaStore.init();
});
