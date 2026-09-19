/**
 * MINOZA STORE — ADMIN DASHBOARD CONTROLLER (v2)
 * Features:
 * 1. Non-overflowing responsive modal with sticky save footer
 * 2. Drag & Drop file uploads (Base64 -> /api/upload -> /uploads/...)
 * 3. Multi-image gallery manager with preview & delete
 * 4. Dynamic package tiers builder (1 แถม 1, 2 แถม 1, 1 แถม 2, etc.)
 * 5. Color swatches & Material settings
 * 6. Homepage Banners & Dual Tiles manager
 */

(function () {
  let products = [];
  let editingProductId = null;
  let currentGallery = [];
  let currentPackages = [];

  // DOM: Tabs
  const tabBtnProducts = document.getElementById('tabBtnProducts');
  const tabBtnHomepage = document.getElementById('tabBtnHomepage');
  const tabBtnUsers = document.getElementById('tabBtnUsers');
  const tabPaneProducts = document.getElementById('tabPaneProducts');
  const tabPaneHomepage = document.getElementById('tabPaneHomepage');
  const tabPaneUsers = document.getElementById('tabPaneUsers');

  // DOM: Products Table & Filters
  const productsTableBody = document.getElementById('productsTableBody');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const totalProductsEl = document.getElementById('totalProductsCount');
  const bogoProductsEl = document.getElementById('bogoProductsCount');
  const totalOrdersEl = document.getElementById('totalOrdersCount');
  const totalRevenueEl = document.getElementById('totalRevenueCount');

  // DOM: Product Modal
  const productModal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const productForm = document.getElementById('productForm');
  const inputId = document.getElementById('prodId');
  const inputSlug = document.getElementById('prodSlug');
  const inputName = document.getElementById('prodName');
  const inputCategory = document.getElementById('prodCategory');
  const inputPrice = document.getElementById('prodPrice');
  const inputOriginalPrice = document.getElementById('prodOriginalPrice');
  const inputBadge = document.getElementById('prodBadge');
  const inputImage = document.getElementById('prodImage');
  const imagePreview = document.getElementById('imagePreview');
  const inputHoverImage = document.getElementById('prodHoverImage');
  const hoverImagePreview = document.getElementById('hoverImagePreview');
  const inputTagline = document.getElementById('prodTagline');
  const inputDescription = document.getElementById('prodDescription');
  const inputMaterial = document.getElementById('prodMaterial');
  const inputIsSoldOut = document.getElementById('prodIsSoldOut');
  const modalViewLiveBtn = document.getElementById('modalViewLiveBtn');
  const galleryGrid = document.getElementById('galleryGrid');
  const packagesContainer = document.getElementById('packagesContainer');

  // Drop Zones
  const mainDropZone = document.getElementById('mainDropZone');
  const mainFileInput = document.getElementById('mainFileInput');
  const hoverDropZone = document.getElementById('hoverDropZone');
  const hoverFileInput = document.getElementById('hoverFileInput');
  const galleryDropZone = document.getElementById('galleryDropZone');
  const galleryFileInput = document.getElementById('galleryFileInput');

  // Delete Modal
  const deleteModal = document.getElementById('deleteModal');
  const deleteItemName = document.getElementById('deleteItemName');
  let pendingDeleteId = null;

  // Toast
  const toast = document.getElementById('adminToast');
  let toastTimer = null;

  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = (isError ? '⚠️ ' : '✅ ') + message;
    toast.className = 'toast-notification active ' + (isError ? 'toast-error' : 'toast-success');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'toast-notification';
    }, 3500);
  }

  // File Upload Helper with Automatic Client-Side Compression for High-Res Photos
  async function uploadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          let payload = reader.result;

          // If image is a large photo, resize to web resolution via canvas
          if (file.type && file.type.startsWith('image/') && !file.type.includes('svg')) {
            try {
              payload = await compressImage(reader.result, 1920, 0.88);
            } catch (e) {
              payload = reader.result;
            }
          }

          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader()
            },
            body: JSON.stringify({
              data: payload,
              filename: file.name
            })
          });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed');
          resolve(json.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressImage(dataUrl, maxDim = 1920, quality = 0.88) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Setup Drag & Drop Handlers
  function setupDropZone(dropZoneEl, fileInputEl, onFileUploaded) {
    if (!dropZoneEl || !fileInputEl) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneEl.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneEl.classList.remove('dragover');
      });
    });

    dropZoneEl.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    });

    fileInputEl.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    });

    async function handleFiles(files) {
      showToast('กำลังอัปโหลดรูปภาพ...');
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;
          const url = await uploadImageFile(file);
          onFileUploaded(url);
        }
        showToast('อัปโหลดรูปภาพสำเร็จ!');
      } catch (err) {
        console.error(err);
        showToast('อัปโหลดรูปล้มเหลว: ' + err.message, true);
      }
    }
  }

  setupDropZone(mainDropZone, mainFileInput, (url) => {
    inputImage.value = url;
    imagePreview.src = url;
  });

  setupDropZone(hoverDropZone, hoverFileInput, (url) => {
    if (inputHoverImage) inputHoverImage.value = url;
    if (hoverImagePreview) hoverImagePreview.src = url;
  });

  if (inputHoverImage) {
    inputHoverImage.addEventListener('input', () => {
      if (hoverImagePreview) hoverImagePreview.src = inputHoverImage.value.trim() || '/images/jewelry/cross_chain_neck_back.jpg';
    });
  }

  setupDropZone(galleryDropZone, galleryFileInput, (url) => {
    if (!currentGallery.includes(url)) {
      currentGallery.push(url);
      renderGallery();
    }
  });

  function renderGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = currentGallery.map((url, idx) => `
      <div class="gallery-item">
        <img src="${url}" alt="Gallery ${idx + 1}" onerror="this.src='/images/jewelry/cross_chain_main.jpg'" />
        <button type="button" class="btn-del-gallery" onclick="window.MinozaAdmin.removeGalleryItem(${idx})" title="ลบรูป">✕</button>
      </div>
    `).join('');
  }

  function removeGalleryItem(idx) {
    currentGallery.splice(idx, 1);
    renderGallery();
  }

  // Dynamic Packages Builder
  function renderPackages() {
    if (!packagesContainer) return;
    if (currentPackages.length === 0) {
      currentPackages = [
        {
          id: 1,
          title: 'ซื้อ 1 เส้น (ชิ้นเดี่ยว)',
          qty: 1,
          price: 590,
          originalPrice: 790,
          badge: '',
          freeShipping: false,
          subText: '+ ค่าจัดส่งด่วน 50 ฿'
        },
        {
          id: 2,
          title: '2 เส้น (คู่) — ซื้อ 1 แถม 1 ฟรี',
          qty: 2,
          price: 890,
          originalPrice: 1180,
          badge: 'BESTSELLER / คู่คุ้มสุด',
          freeShipping: true,
          subText: '✓ ฟรีค่าจัดส่งด่วนทั่วประเทศ'
        }
      ];
    }

    packagesContainer.innerHTML = currentPackages.map((pkg, idx) => `
      <div class="package-tier-item">
        <div class="tier-header">
          <span class="tier-title-pill">แบบที่ ${idx + 1}: ${pkg.title || 'แพ็กเกจ'}</span>
          ${currentPackages.length > 1 ? `<button type="button" class="btn-del-tier" onclick="window.MinozaAdmin.removePackageTier(${idx})">🗑️ ลบแบบนี้</button>` : ''}
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>ชื่อตัวเลือกแพ็กเกจ *</label>
            <input type="text" value="${pkg.title || ''}" oninput="window.MinozaAdmin.updatePackageField(${idx}, 'title', this.value)" placeholder="เช่น ซื้อ 2 แถม 1 ฟรี" required />
          </div>
          <div class="form-group">
            <label>ราคาขายจริง ฿ *</label>
            <input type="number" value="${pkg.price || 0}" oninput="window.MinozaAdmin.updatePackageField(${idx}, 'price', Number(this.value))" required />
          </div>
          <div class="form-group">
            <label>ราคาปกติขีดฆ่า ฿</label>
            <input type="number" value="${pkg.originalPrice || 0}" oninput="window.MinozaAdmin.updatePackageField(${idx}, 'originalPrice', Number(this.value))" />
          </div>
        </div>
        <div class="form-grid-3" style="margin-bottom: 0;">
          <div class="form-group">
            <label>จำนวนชิ้นที่ได้รับ (Qty)</label>
            <input type="number" value="${pkg.qty || 1}" oninput="window.MinozaAdmin.updatePackageField(${idx}, 'qty', Number(this.value))" min="1" />
          </div>
          <div class="form-group">
            <label>ป้ายกำกับ (Badge)</label>
            <input type="text" value="${pkg.badge || ''}" oninput="window.MinozaAdmin.updatePackageField(${idx}, 'badge', this.value)" placeholder="เช่น BESTSELLER, คุ้มสุด" />
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 14px; margin-top: 24px; flex-wrap: wrap;">
            <label for="freeShip_${idx}" style="display: flex; align-items: center; gap: 6px; margin-bottom: 0; cursor: pointer;">
              <input type="checkbox" id="freeShip_${idx}" ${pkg.freeShipping ? 'checked' : ''} onchange="window.MinozaAdmin.updatePackageField(${idx}, 'freeShipping', this.checked)" style="width: auto;" />
              <span>จัดส่งฟรี</span>
            </label>
            <label for="soldOut_${idx}" style="display: flex; align-items: center; gap: 6px; margin-bottom: 0; cursor: pointer; color: #dc2626; font-weight: 700;">
              <input type="checkbox" id="soldOut_${idx}" ${pkg.isSoldOut ? 'checked' : ''} onchange="window.MinozaAdmin.updatePackageField(${idx}, 'isSoldOut', this.checked)" style="width: auto; accent-color: #dc2626;" />
              <span>🔴 ตัวเลือกนี้หมด (Sold Out)</span>
            </label>
          </div>
        </div>
      </div>
    `).join('');
  }

  function addPackageTier(templateType) {
    let newTier = {
      id: currentPackages.length + 1,
      title: 'ตัวเลือกใหม่',
      qty: 1,
      price: 990,
      originalPrice: 1490,
      badge: '',
      freeShipping: true,
      subText: '✓ ฟรีค่าจัดส่งด่วน'
    };

    if (templateType === 'bogo') {
      newTier.title = '2 ชิ้น — ซื้อ 1 แถม 1 ฟรี';
      newTier.qty = 2;
      newTier.badge = 'BESTSELLER / คู่คุ้มสุด';
    } else if (templateType === 'buy2get1') {
      newTier.title = '3 ชิ้น — ซื้อ 2 แถม 1 ฟรี (เซ็ต 3 ชิ้น)';
      newTier.qty = 3;
      newTier.badge = 'คุ้มค่าที่สุด';
    } else if (templateType === 'buy1get2') {
      newTier.title = '3 ชิ้น — ซื้อ 1 แถม 2 ฟรี (ลิมิเต็ด)';
      newTier.qty = 3;
      newTier.badge = 'MEGA DEAL';
    }

    currentPackages.push(newTier);
    renderPackages();
  }

  function removePackageTier(idx) {
    if (currentPackages.length <= 1) return;
    currentPackages.splice(idx, 1);
    renderPackages();
  }

  function updatePackageField(idx, field, value) {
    if (currentPackages[idx]) {
      currentPackages[idx][field] = value;
    }
  }

  // Tab Switcher
  if (tabBtnProducts && tabBtnHomepage) {
    tabBtnProducts.addEventListener('click', () => {
      tabBtnProducts.classList.add('active');
      tabBtnHomepage.classList.remove('active');
      if (tabBtnUsers) tabBtnUsers.classList.remove('active');
      tabPaneProducts.classList.add('active');
      tabPaneHomepage.classList.remove('active');
      if (tabPaneUsers) tabPaneUsers.classList.remove('active');
    });

    tabBtnHomepage.addEventListener('click', () => {
      tabBtnHomepage.classList.add('active');
      tabBtnProducts.classList.remove('active');
      if (tabBtnUsers) tabBtnUsers.classList.remove('active');
      tabPaneHomepage.classList.add('active');
      tabPaneProducts.classList.remove('active');
      if (tabPaneUsers) tabPaneUsers.classList.remove('active');
      loadHomepageSettings();
    });

    if (tabBtnUsers) {
      tabBtnUsers.addEventListener('click', () => {
        tabBtnUsers.classList.add('active');
        tabBtnProducts.classList.remove('active');
        tabBtnHomepage.classList.remove('active');
        if (tabPaneUsers) tabPaneUsers.classList.add('active');
        tabPaneProducts.classList.remove('active');
        tabPaneHomepage.classList.remove('active');
        loadAdminUsers();
      });
    }
  }

  // Load Products & Orders
  async function loadData() {
    try {
      const ts = Date.now();
      const [prodRes, orderRes] = await Promise.all([
        fetch(`/api/products?_t=${ts}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/orders?_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ totalOrders: 0, totalRevenue: 0 }))
      ]);

      products = Array.isArray(prodRes) ? prodRes : [];
      renderMetrics(orderRes);
      renderProducts();
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('ไม่สามารถดึงข้อมูลสินค้าได้: ' + err.message, true);
    }
  }

  function renderMetrics(orderData) {
    if (totalProductsEl) totalProductsEl.textContent = products.length;
    if (bogoProductsEl) {
      const bogoCount = products.filter(p => p.bundle2Price !== undefined || (p.packages && p.packages.length > 1)).length;
      bogoProductsEl.textContent = bogoCount;
    }
    if (totalOrdersEl && orderData) {
      totalOrdersEl.textContent = (orderData.totalOrders || 0).toLocaleString();
    }
    if (totalRevenueEl && orderData) {
      totalRevenueEl.textContent = '฿' + (orderData.totalRevenue || 0).toLocaleString();
    }
  }

  function renderProducts() {
    if (!productsTableBody) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = categoryFilter ? categoryFilter.value : '';

    const filtered = products.filter(p => {
      const matchesSearch = !query ||
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.slug && p.slug.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      const matchesCategory = !cat || p.category === cat;
      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      productsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            📦 ไม่พบรายการสินค้าตามเงื่อนไขที่ค้นหา
          </td>
        </tr>
      `;
      return;
    }

    productsTableBody.innerHTML = filtered.map(p => {
      const badgeClass = p.badge === 'BESTSELLER' ? 'badge-bestseller' : (p.badge === 'NEW' ? 'badge-new' : 'badge-sale');
      const imgUrl = p.image || '/images/jewelry/cross_chain_main.jpg';
      const origPrice = p.originalPrice ? `<span class="price-orig">${p.originalPrice.toLocaleString()} ฿</span>` : '';
      const pkgCount = (p.packages && p.packages.length) ? `${p.packages.length} แบบราคา` : (p.bundle2Price ? '1 แถม 1' : 'ชิ้นเดี่ยว');

      return `
        <tr data-id="${p.id}">
          <td>
            <div class="product-cell-wrap">
              <div class="product-thumb-box">
                <img src="${imgUrl}" alt="${p.name}" onerror="this.src='/images/jewelry/cross_chain_main.jpg'" />
              </div>
              <div>
                <div class="product-title-text">${p.name}</div>
                <div class="product-slug-text">/${p.slug || p.id}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge-category">${p.category || 'General'}</span>
          </td>
          <td>
            <span class="price-bold">${Number(p.price || 0).toLocaleString()} ฿</span>
            ${origPrice}
          </td>
          <td>
            <span class="badge-pill ${badgeClass}">${p.badge || 'STANDARD'}</span>
          </td>
          <td>
            <button type="button" 
                    class="stock-toggle-pill ${p.isSoldOut ? 'is-sold-out' : 'is-in-stock'}" 
                    onclick="window.MinozaAdmin.toggleStockStatus('${p.id}')" 
                    title="${p.isSoldOut ? 'สถานะ: ของหมด (คลิกเพื่อเปิดขาย)' : 'สถานะ: พร้อมส่ง (คลิกเพื่อปิดของหมด)'}">
              <span class="stock-pill-indicator"></span>
              <span class="stock-pill-text">${p.isSoldOut ? 'ของหมด' : 'พร้อมส่ง'}</span>
            </button>
          </td>
          <td>
            <span style="font-size: 13px; color: #15803d; font-weight: 700;">
              🏷️ ${pkgCount}
            </span>
          </td>
          <td>
            <div class="action-buttons-group">
              <button type="button" class="btn-action-edit" onclick="window.MinozaAdmin.openEditModal('${p.id}')">
                ✏️ แก้ไข
              </button>
              <a href="/product/${p.slug || p.id}" target="_blank" class="btn-action-view" title="ดูหน้าสินค้าจริง">
                👁️
              </a>
              <button type="button" class="btn-action-del" onclick="window.MinozaAdmin.confirmDelete('${p.id}', '${escapeHtml(p.name)}')" title="ลบสินค้า">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // Open Create Modal
  function openCreateModal() {
    editingProductId = null;
    if (modalTitle) modalTitle.textContent = '➕ เพิ่มสินค้าใหม่ (Add Product)';
    if (productForm) productForm.reset();
    if (inputId) inputId.value = '';
    if (inputBadge) inputBadge.value = 'NEW';
    if (inputCategory) inputCategory.value = 'Chains & Necklaces';
    if (imagePreview) imagePreview.src = '/images/jewelry/cross_chain_main.jpg';
    if (inputMaterial) inputMaterial.value = 'MATERIAL — พรีเมียม 316L Stainless Steel (กันน้ำ 100%)';

    // Reset Swatches
    document.querySelectorAll('.swatch-checkbox').forEach(cb => {
      cb.checked = (cb.value === 'Silver' || cb.value === '18K Gold');
    });

    currentGallery = ['/images/jewelry/cross_chain_main.jpg'];
    renderGallery();

    currentPackages = [
      {
        id: 1,
        title: 'ซื้อ 1 เส้น (ชิ้นเดี่ยว)',
        qty: 1,
        price: 590,
        originalPrice: 790,
        badge: '',
        freeShipping: false,
        subText: '+ ค่าจัดส่งด่วน 50 ฿'
      },
      {
        id: 2,
        title: '2 เส้น (คู่) — ซื้อ 1 แถม 1 ฟรี',
        qty: 2,
        price: 890,
        originalPrice: 1180,
        badge: 'BESTSELLER / คู่คุ้มสุด',
        freeShipping: true,
        subText: '✓ ฟรีค่าจัดส่งด่วนทั่วประเทศ'
      }
    ];
    renderPackages();

    if (inputHoverImage) inputHoverImage.value = '';
    if (hoverImagePreview) hoverImagePreview.src = '/images/jewelry/cross_chain_neck_back.jpg';
    if (inputIsSoldOut) inputIsSoldOut.checked = false;
    if (modalViewLiveBtn) modalViewLiveBtn.style.display = 'none';

    if (productModal) productModal.classList.add('active');
  }

  // Open Edit Modal
  function openEditModal(id) {
    const p = products.find(prod => prod.id === id || prod.slug === id);
    if (!p) {
      showToast('ไม่พบข้อมูลสินค้านี้', true);
      return;
    }

    editingProductId = p.id;
    if (modalTitle) modalTitle.textContent = '✏️ แก้ไขสินค้า: ' + p.name;
    if (inputId) inputId.value = p.id;
    if (inputSlug) inputSlug.value = p.slug || p.id;
    if (inputName) inputName.value = p.name || '';
    if (inputCategory) inputCategory.value = p.category || 'Chains & Necklaces';
    if (inputPrice) inputPrice.value = p.price || '';
    if (inputOriginalPrice) inputOriginalPrice.value = p.originalPrice || '';
    if (inputBadge) inputBadge.value = p.badge || 'BESTSELLER';
    if (inputImage) inputImage.value = p.image || '';
    if (imagePreview) imagePreview.src = p.image || '/images/jewelry/cross_chain_main.jpg';
    if (inputHoverImage) inputHoverImage.value = p.hoverImage || '';
    if (hoverImagePreview) hoverImagePreview.src = p.hoverImage || p.image || '/images/jewelry/cross_chain_neck_back.jpg';
    if (inputTagline) inputTagline.value = p.tagline || '';
    if (inputDescription) inputDescription.value = p.description || '';
    if (inputMaterial) inputMaterial.value = p.material || 'MATERIAL — พรีเมียม 316L Stainless Steel (กันน้ำ 100%)';
    if (inputIsSoldOut) inputIsSoldOut.checked = Boolean(p.isSoldOut);

    if (modalViewLiveBtn) {
      modalViewLiveBtn.href = '/product/' + (p.slug || p.id);
      modalViewLiveBtn.style.display = 'inline-block';
    }

    // Color Swatches
    const prodColors = Array.isArray(p.colors) ? p.colors : ['Silver', '18K Gold'];
    document.querySelectorAll('.swatch-checkbox').forEach(cb => {
      cb.checked = prodColors.includes(cb.value);
    });

    // Gallery
    currentGallery = Array.isArray(p.gallery) && p.gallery.length > 0 ? [...p.gallery] : [p.image || '/images/jewelry/cross_chain_main.jpg'];
    renderGallery();

    // Packages
    if (Array.isArray(p.packages) && p.packages.length > 0) {
      currentPackages = JSON.parse(JSON.stringify(p.packages));
    } else {
      currentPackages = [
        {
          id: 1,
          title: p.bundle1Title || `ซื้อ 1 ชิ้น (${p.price} ฿)`,
          qty: 1,
          price: p.price,
          originalPrice: p.originalPrice,
          badge: '',
          freeShipping: false,
          subText: '+ ค่าจัดส่งด่วน 50 ฿'
        },
        {
          id: 2,
          title: p.bundle2Title || '2 ชิ้น — ซื้อ 1 แถม 1 ฟรี',
          qty: 2,
          price: p.bundle2Price !== undefined ? p.bundle2Price : p.price,
          originalPrice: (p.originalPrice || p.price * 1.3) * 2,
          badge: 'BESTSELLER / คู่คุ้มสุด',
          freeShipping: true,
          subText: '✓ ฟรีค่าจัดส่งด่วนทั่วประเทศ'
        }
      ];
    }
    renderPackages();

    if (productModal) productModal.classList.add('active');
  }

  function closeModal() {
    if (productModal) productModal.classList.remove('active');
    editingProductId = null;
  }

  // Save Product (Create or Update)
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Collect checked colors
    const selectedColors = [];
    document.querySelectorAll('.swatch-checkbox:checked').forEach(cb => {
      selectedColors.push(cb.value);
    });

    const payload = {
      name: inputName.value.trim(),
      slug: inputSlug.value.trim() || undefined,
      category: inputCategory.value,
      price: Number(inputPrice.value),
      originalPrice: inputOriginalPrice.value ? Number(inputOriginalPrice.value) : undefined,
      badge: inputBadge.value,
      image: inputImage.value.trim() || '/images/jewelry/cross_chain_main.jpg',
      hoverImage: inputHoverImage ? inputHoverImage.value.trim() : undefined,
      gallery: currentGallery.length > 0 ? currentGallery : [inputImage.value.trim() || '/images/jewelry/cross_chain_main.jpg'],
      tagline: inputTagline.value.trim(),
      description: inputDescription.value.trim(),
      material: inputMaterial.value.trim(),
      colors: selectedColors,
      packages: currentPackages,
      isSoldOut: inputIsSoldOut ? inputIsSoldOut.checked : false,
      inStock: inputIsSoldOut ? !inputIsSoldOut.checked : true,
      bundle2Title: currentPackages[1] ? currentPackages[1].title : undefined,
      bundle2Price: currentPackages[1] ? currentPackages[1].price : undefined
    };

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกสินค้า');
      }

      showToast(editingProductId ? 'แก้ไขสินค้าเรียบร้อยแล้ว!' : 'เพิ่มสินค้าใหม่เรียบร้อยแล้ว!');
      closeModal();
      await loadData();
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message, true);
    }
  }

  // Delete flow
  function confirmDelete(id, name) {
    pendingDeleteId = id;
    if (deleteItemName) deleteItemName.textContent = name || id;
    if (deleteModal) deleteModal.classList.add('active');
  }

  function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.remove('active');
    pendingDeleteId = null;
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;

    try {
      const res = await fetch(`/api/products/${pendingDeleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถลบสินค้าได้');
      }

      showToast('ลบสินค้าออกจากระบบเรียบร้อยแล้ว');
      closeDeleteModal();
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message, true);
    }
  }

  // =========================================================================
  // HOMEPAGE SETTINGS CONTROLLER
  // =========================================================================
  async function loadHomepageSettings() {
    try {
      const res = await fetch('/api/settings/homepage');
      const settings = await res.json();

      const hero = settings.hero || {};
      const marquee = settings.marquee || {};
      const tiles = settings.tiles || {};

      const heroRating = document.getElementById('settingHeroRating');
      const heroTitle = document.getElementById('settingHeroTitle');
      const heroImage = document.getElementById('settingHeroImage');
      const heroPreview = document.getElementById('heroImagePreview');
      const marqueeText = document.getElementById('settingMarqueeText');

      const leftTitle = document.getElementById('settingLeftTileTitle');
      const leftSubtitle = document.getElementById('settingLeftTileSubtitle');
      const leftImage = document.getElementById('settingLeftTileImage');
      const leftPreview = document.getElementById('leftTileImagePreview');

      const rightTitle = document.getElementById('settingRightTileTitle');
      const rightSubtitle = document.getElementById('settingRightTileSubtitle');
      const rightImage = document.getElementById('settingRightTileImage');
      const rightPreview = document.getElementById('rightTileImagePreview');

      if (heroRating) heroRating.value = hero.rating || '';
      if (heroTitle) heroTitle.value = hero.title || '';
      if (heroImage) heroImage.value = hero.bgImage || '';
      if (heroPreview) heroPreview.src = hero.bgImage || '/images/hero_yacht_model.jpg';
      if (marqueeText) marqueeText.value = marquee.text || '';

      if (leftTitle) leftTitle.value = tiles.leftTitle || '';
      if (leftSubtitle) leftSubtitle.value = tiles.leftSubtitle || '';
      if (leftImage) leftImage.value = tiles.leftImage || '';
      if (leftPreview) leftPreview.src = tiles.leftImage || '/images/tile_watches.jpg';

      if (rightTitle) rightTitle.value = tiles.rightTitle || '';
      if (rightSubtitle) rightSubtitle.value = tiles.rightSubtitle || '';
      if (rightImage) rightImage.value = tiles.rightImage || '';
      if (rightPreview) rightPreview.src = tiles.rightImage || '/images/tile_jewelry.jpg';

      // Setup dropzones for Homepage images
      setupDropZone(document.getElementById('heroDropZone'), document.getElementById('heroFileInput'), (url) => {
        if (heroImage) heroImage.value = url;
        if (heroPreview) heroPreview.src = url;
      });

      setupDropZone(document.getElementById('leftTileDropZone'), document.getElementById('leftTileFileInput'), (url) => {
        if (leftImage) leftImage.value = url;
        if (leftPreview) leftPreview.src = url;
      });

      setupDropZone(document.getElementById('rightTileDropZone'), document.getElementById('rightTileFileInput'), (url) => {
        if (rightImage) rightImage.value = url;
        if (rightPreview) rightPreview.src = url;
      });

    } catch (err) {
      console.error('Failed to load homepage settings:', err);
      showToast('ไม่สามารถดึงข้อมูลหน้าแรกได้', true);
    }
  }

  async function saveHomepageSettings(e) {
    if (e) e.preventDefault();

    const saveBtn = document.getElementById('saveHomepageBtn');
    let origHtml = '';
    if (saveBtn) {
      origHtml = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>⏳ กำลังบันทึกการตั้งค่า...</span>';
    }

    const payload = {
      hero: {
        rating: document.getElementById('settingHeroRating')?.value || '',
        title: document.getElementById('settingHeroTitle')?.value || '',
        bgImage: document.getElementById('settingHeroImage')?.value || '/images/hero_yacht_model.jpg',
        bullets: ['1 แถม 1 ฟรี', 'รับประกันตลอดชีพ', 'จัดส่งฟรีทั่วไทย'],
        buttonText: 'เลือกชมสินค้า →',
        buttonLink: '#bestSellers'
      },
      marquee: {
        text: document.getElementById('settingMarqueeText')?.value || ''
      },
      tiles: {
        leftTitle: document.getElementById('settingLeftTileTitle')?.value || '',
        leftSubtitle: document.getElementById('settingLeftTileSubtitle')?.value || '',
        leftButton: 'ดูคอลเลกชันนาฬิกา →',
        leftLink: '/#bestSellers',
        leftImage: document.getElementById('settingLeftTileImage')?.value || '/images/tile_watches.jpg',
        rightTitle: document.getElementById('settingRightTileTitle')?.value || '',
        rightSubtitle: document.getElementById('settingRightTileSubtitle')?.value || '',
        rightButton: 'เลือกซื้อเลย →',
        rightLink: '/#bestSellers',
        rightImage: document.getElementById('settingRightTileImage')?.value || '/images/tile_jewelry.jpg'
      }
    };

    try {
      const res = await fetch('/api/settings/homepage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save');

      try {
        localStorage.setItem('minoza_homepage_settings', JSON.stringify(payload));
      } catch (e) {}

      showToast('บันทึกการตั้งค่าหน้าแรกสำเร็จ! หน้าเว็บอัปเดตเรียบร้อย');
    } catch (err) {
      console.error(err);
      showToast('บันทึกล้มเหลว: ' + err.message, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml || '<span>💾 บันทึกการตั้งค่าหน้าแรก (Save Homepage Settings)</span>';
      }
    }
  }

  // Quick Stock Status Toggle (In Stock / Sold Out) with Instant Optimistic UI Update
  async function toggleStockStatus(id) {
    const p = products.find(prod => prod.id === id || prod.slug === id);
    if (!p) return;

    // 1. Instant Optimistic UI Update (0ms delay)
    const prevSoldOut = Boolean(p.isSoldOut);
    const nextSoldOut = !prevSoldOut;
    p.isSoldOut = nextSoldOut;
    p.inStock = !nextSoldOut;

    // Directly update DOM pill button
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (tr) {
      const pillBtn = tr.querySelector('.stock-toggle-pill');
      if (pillBtn) {
        pillBtn.className = `stock-toggle-pill ${nextSoldOut ? 'is-sold-out' : 'is-in-stock'}`;
        pillBtn.title = nextSoldOut ? 'สถานะ: ของหมด (คลิกเพื่อเปิดขาย)' : 'สถานะ: พร้อมส่ง (คลิกเพื่อปิดของหมด)';
        pillBtn.innerHTML = `
          <span class="stock-pill-indicator"></span>
          <span class="stock-pill-text">${nextSoldOut ? 'ของหมด' : 'พร้อมส่ง'}</span>
        `;
      }
    }

    const statusMsg = nextSoldOut 
      ? `🔴 ตั้งสถานะ "${p.name}" เป็น "ของหมด" เรียบร้อยแล้ว` 
      : `🟢 ตั้งสถานะ "${p.name}" เป็น "พร้อมส่ง" เรียบร้อยแล้ว`;
    showToast(statusMsg);

    // 2. Persist to server in background
    try {
      const res = await fetch(`/api/products/${id}/toggle-stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกสถานะ');
      }
    } catch (err) {
      console.error('Toggle stock error:', err);
      // Revert optimistic state if server failed
      p.isSoldOut = prevSoldOut;
      p.inStock = !prevSoldOut;
      if (tr) {
        const pillBtn = tr.querySelector('.stock-toggle-pill');
        if (pillBtn) {
          pillBtn.className = `stock-toggle-pill ${prevSoldOut ? 'is-sold-out' : 'is-in-stock'}`;
          pillBtn.innerHTML = `
            <span class="stock-pill-indicator"></span>
            <span class="stock-pill-text">${prevSoldOut ? 'ของหมด' : 'พร้อมส่ง'}</span>
          `;
        }
      }
      showToast('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message, true);
    }
  }

  // =========================================================================
  // AUTHENTICATION & ADMIN USER MANAGEMENT
  // =========================================================================

  function getAuthHeader() {
    const token = localStorage.getItem('minoza_admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function checkAuth() {
    const token = localStorage.getItem('minoza_admin_token');
    const loginOverlay = document.getElementById('adminLoginView');
    const userBadge = document.getElementById('adminUserBadge');
    const currentAdminName = document.getElementById('currentAdminName');

    if (!token) {
      if (loginOverlay) loginOverlay.style.display = 'flex';
      if (userBadge) userBadge.style.display = 'none';
      return false;
    }

    try {
      const res = await fetch('/api/admin/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Session invalid');
      const data = await res.json();
      if (data.success && data.user) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (userBadge) userBadge.style.display = 'flex';
        if (currentAdminName) currentAdminName.textContent = data.user.name || data.user.username;
        return true;
      } else {
        throw new Error('Invalid user');
      }
    } catch (err) {
      localStorage.removeItem('minoza_admin_token');
      if (loginOverlay) loginOverlay.style.display = 'flex';
      if (userBadge) userBadge.style.display = 'none';
      return false;
    }
  }

  async function handleLogin() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const alertEl = document.getElementById('loginAlert');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (alertEl) alertEl.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังตรวจสอบ...';
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      localStorage.setItem('minoza_admin_token', data.token);
      localStorage.setItem('minoza_admin_user', JSON.stringify(data.user));

      const loginOverlay = document.getElementById('adminLoginView');
      if (loginOverlay) loginOverlay.style.display = 'none';

      const userBadge = document.getElementById('adminUserBadge');
      if (userBadge) userBadge.style.display = 'flex';
      const currentAdminName = document.getElementById('currentAdminName');
      if (currentAdminName) currentAdminName.textContent = data.user.name || data.user.username;

      showToast(`ยินดีต้อนรับคุณ ${data.user.name || data.user.username}`);
      await loadData();
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message;
        alertEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'เข้าสู่ระบบ (Log In) 🔒';
      }
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: getAuthHeader()
      });
    } catch (e) {}

    localStorage.removeItem('minoza_admin_token');
    localStorage.removeItem('minoza_admin_user');
    const loginOverlay = document.getElementById('adminLoginView');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    const userBadge = document.getElementById('adminUserBadge');
    if (userBadge) userBadge.style.display = 'none';
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  }

  async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">กำลังโหลดรายชื่อผู้ดูแล...</td></tr>`;

    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeader() });
      if (res.status === 401) {
        checkAuth();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load users');

      const users = data.users || [];
      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">ไม่พบรายชื่อผู้ดูแลในระบบ</td></tr>`;
        return;
      }

      const currentTokenUser = JSON.parse(localStorage.getItem('minoza_admin_user') || '{}');

      tbody.innerHTML = users.map(u => {
        const isSelf = currentTokenUser && currentTokenUser.id === u.id;
        const isLast = users.length <= 1;
        const roleBadge = u.role === 'superadmin'
          ? `<span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Super Admin</span>`
          : u.role === 'staff'
          ? `<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Staff</span>`
          : `<span style="background: #ecfdf5; color: #047857; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Admin</span>`;

        const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '-';

        const deleteBtn = (isSelf || isLast)
          ? `<button type="button" disabled style="background: #f1f5f9; color: #94a3b8; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: not-allowed;" title="${isSelf ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ไม่สามารถลบแอดมินคนสุดท้ายได้'}">ลบไม่ได้</button>`
          : `<button type="button" onclick="window.MinozaAdmin.deleteAdminUser('${u.id}', '${escapeHtml(u.username)}')" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">🗑️ ลบ</button>`;

        return `
          <tr>
            <td><strong style="color: #0f172a;">${u.username}</strong> ${isSelf ? '<span style="font-size: 11px; color: #64748b;">(คุณ)</span>' : ''}</td>
            <td>${u.name || '-'}</td>
            <td>${roleBadge}</td>
            <td style="color: #64748b; font-size: 12.5px;">${dateStr}</td>
            <td style="text-align: right;">${deleteBtn}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('loadAdminUsers error:', err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #dc2626;">โหลดข้อมูลไม่สำเร็จ: ${err.message}</td></tr>`;
    }
  }

  function openCreateUserModal() {
    const modal = document.getElementById('adminUserModal');
    const alertEl = document.getElementById('userModalAlert');
    const form = document.getElementById('adminUserForm');
    if (form) form.reset();
    if (alertEl) alertEl.style.display = 'none';
    if (modal) modal.classList.add('active');
  }

  function closeUserModal() {
    const modal = document.getElementById('adminUserModal');
    if (modal) modal.classList.remove('active');
  }

  async function handleCreateUser() {
    const username = document.getElementById('newAdminUsername').value.trim();
    const name = document.getElementById('newAdminName').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    const role = document.getElementById('newAdminRole').value;
    const alertEl = document.getElementById('userModalAlert');
    const saveBtn = document.getElementById('btnSaveAdminUser');

    if (alertEl) alertEl.style.display = 'none';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ username, name, password, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'สร้างบัญชีแอดมินไม่สำเร็จ');
      }

      closeUserModal();
      showToast(`เพิ่มแอดมิน "${username}" เรียบร้อยแล้ว`);
      await loadAdminUsers();
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message;
        alertEl.style.display = 'block';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 บันทึกแอดมินใหม่';
      }
    }
  }

  async function deleteAdminUser(id, username) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแอดมิน "${username}" ออกจากระบบ?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ลบไม่สำเร็จ');
      }

      showToast(`ลบแอดมิน "${username}" เรียบร้อยแล้ว`);
      await loadAdminUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function resetOrders() {
    if (!confirm('ยืนยันต้องการล้างข้อมูลคำสั่งซื้อและยอดขายทั้งหมดเป็น 0 หรือไม่?\n\n(ระบบจะเริ่มนับออเดอร์ใหม่จากลูกค้าจริงทันที)')) return;
    try {
      const res = await fetch('/api/orders/reset', { method: 'POST', headers: getAuthHeader() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset orders');
      if (totalOrdersEl) totalOrdersEl.textContent = '0';
      if (totalRevenueEl) totalRevenueEl.textContent = '฿0';
      showToast('รีเซ็ตคำสั่งซื้อและยอดขายเป็น 0 เรียบร้อยแล้ว');
    } catch (err) {
      showToast('ไม่สามารถรีเซ็ตได้: ' + err.message, true);
    }
  }

  // Event Listeners
  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
  if (productForm) productForm.addEventListener('submit', handleFormSubmit);

  const homepageForm = document.getElementById('homepageSettingsForm');
  if (homepageForm) homepageForm.addEventListener('submit', saveHomepageSettings);

  // Global exports for inline onclick attributes
  window.MinozaAdmin = {
    openCreateModal,
    openEditModal,
    closeModal,
    confirmDelete,
    closeDeleteModal,
    executeDelete,
    toggleStockStatus,
    removeGalleryItem,
    addPackageTier,
    removePackageTier,
    updatePackageField,
    saveHomepageSettings,
    handleLogin,
    logout,
    openCreateUserModal,
    closeUserModal,
    handleCreateUser,
    deleteAdminUser,
    resetOrders
  };

  // Init
  document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAuth();
    if (isAuthed) {
      await loadData();
    }
  });
})();
