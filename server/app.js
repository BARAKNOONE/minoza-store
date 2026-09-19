require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhook');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');

const app = express();

// Enable CORS
app.use(cors());

// Raw body for Stripe Webhook verification before JSON parser
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

// JSON and URL-encoded body parsing (increased for base64 image uploads)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Serve static frontend files from /public (index: false so SSR route handles home page)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// API Routes
app.use('/api', paymentRoutes);
app.use('/api', webhookRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', orderRoutes);
app.use('/api/admin', authRoutes.router);

const fs = require('fs');
const store = require('./lib/store');

// Admin Dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

let cachedProductHtml = null;
function getProductHtmlTemplate() {
  if (cachedProductHtml && process.env.NODE_ENV === 'production') {
    return cachedProductHtml;
  }
  const possiblePaths = [
    path.join(__dirname, '../public/product.html'),
    path.join(process.cwd(), 'public/product.html'),
    path.join(__dirname, 'public/product.html'),
    path.join(__dirname, '../../public/product.html')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        cachedProductHtml = fs.readFileSync(p, 'utf8');
        return cachedProductHtml;
      } catch (e) {}
    }
  }
  return null;
}

let cachedIndexHtml = null;
function getIndexHtmlTemplate() {
  if (cachedIndexHtml && process.env.NODE_ENV === 'production') {
    return cachedIndexHtml;
  }
  const possiblePaths = [
    path.join(__dirname, '../public/index.html'),
    path.join(process.cwd(), 'public/index.html'),
    path.join(__dirname, 'public/index.html'),
    path.join(__dirname, '../../public/index.html')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        cachedIndexHtml = fs.readFileSync(p, 'utf8');
        return cachedIndexHtml;
      } catch (e) {}
    }
  }
  return null;
}

// Product details route with Server-Side Hydration (zero flicker, zero delay)
app.get(['/product/:id', '/product/:id/*'], async (req, res) => {
  try {
    const rawId = req.params.id ? String(req.params.id).replace(/\/+$/, '').trim() : '';
    const product = await store.getProduct(rawId);
    let html = getProductHtmlTemplate();
    if (!html) {
      return res.sendFile(path.join(__dirname, '../public/product.html'));
    }

    if (product) {
      // 1. Pre-render Page Titles & Head Meta
      const prodName = product.name || 'MINOZA JEWELRY';
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${prodName} — MINOZA THAILAND BRAND</title>`);
      html = html.replace(/<meta property="og:title" content="[\s\S]*?" \/>/i, `<meta property="og:title" content="${prodName} — MINOZA THAILAND BRAND" />`);
      html = html.replace(/<h1 class="sava-pdp-title">[\s\S]*?<\/h1>/i, `<h1 class="sava-pdp-title">${prodName}</h1>`);

      // 2. Pre-render Pricing
      const mainPrice = product.price ? Number(product.price) : 590;
      const origPrice = product.originalPrice ? Number(product.originalPrice) : Math.round(mainPrice * 1.35);
      
      let displaySale = mainPrice;
      let displayOrig = origPrice;
      if (product.packages && product.packages.length > 1) {
        displaySale = Number(product.packages[1].price) || mainPrice;
        displayOrig = Number(product.packages[1].originalPrice) || origPrice;
      } else if (product.bundle2Price) {
        displaySale = Number(product.bundle2Price);
        displayOrig = Number(product.bundle2OriginalPrice) || Math.round(displaySale * 1.35);
      }

      html = html.replace(
        /<del class="sava-pdp-orig-price" id="pdpOrigPrice">[\s\S]*?<\/del>/i,
        `<del class="sava-pdp-orig-price" id="pdpOrigPrice">${displayOrig.toLocaleString()} ฿</del>`
      );
      html = html.replace(
        /<span class="sava-pdp-sale-price" id="pdpSalePrice">[\s\S]*?<\/span>/i,
        `<span class="sava-pdp-sale-price" id="pdpSalePrice">${displaySale.toLocaleString()} ฿</span>`
      );
      if (displayOrig > displaySale) {
        const diff = displayOrig - displaySale;
        html = html.replace(
          /<span class="sava-pdp-save-badge" id="pdpSaveBadge">[\s\S]*?<\/span>/i,
          `<span class="sava-pdp-save-badge" id="pdpSaveBadge">SAVE ${diff.toLocaleString()} ฿</span>`
        );
      }

      // 3. Pre-render Material
      if (product.material) {
        html = html.replace(
          /<span class="sava-material-label"[^>]*>[\s\S]*?<\/span>/i,
          `<span class="sava-material-label" data-i18n="pdpMaterial">${product.material}</span>`
        );
      }

      // 4. Pre-render Slides & Thumbnails
      let gallery = Array.isArray(product.gallery) && product.gallery.length > 0 
        ? product.gallery 
        : (product.image ? [product.image] : ['/images/jewelry/cross_chain_main.jpg']);
      
      if (gallery[0]) {
        html = html.replace(/<meta property="og:image" content="[\s\S]*?" \/>/i, `<meta property="og:image" content="${gallery[0]}" />`);
      }

      const totalSlides = gallery.length;
      const slidesHtml = gallery.map((img, i) => `
            <div class="sava-carousel-slide" style="${totalSlides === 1 ? 'flex: 0 0 100%; max-width: 100%;' : ''}">
              <img src="${img}" alt="${prodName} View ${i + 1}" />
            </div>`).join('\n');

      const thumbsHtml = gallery.map((img, i) => `
          <button type="button" class="sava-thumb-btn ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})">
            <img src="${img}" alt="Thumb ${i + 1}" />
          </button>`).join('\n');

      html = html.replace(
        /<!-- START_GALLERY_TRACK -->[\s\S]*?<!-- END_GALLERY_TRACK -->/,
        `<!-- START_GALLERY_TRACK -->\n          <div class="sava-carousel-track" id="galleryTrack">\n${slidesHtml}\n          </div>\n          <!-- END_GALLERY_TRACK -->`
      );

      html = html.replace(
        /<!-- START_THUMB_STRIP -->[\s\S]*?<!-- END_THUMB_STRIP -->/,
        `<!-- START_THUMB_STRIP -->\n        <div class="sava-thumbs-strip" id="galleryThumbStrip">\n${thumbsHtml}\n        </div>\n        <!-- END_THUMB_STRIP -->`
      );

      // 5. Pre-render Swatches if present
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        const swatchesHtml = product.colors.map((c, i) => {
          const isGold = c.toLowerCase().includes('gold');
          const isBlack = c.toLowerCase().includes('black');
          const swatchClass = isGold ? 'swatch-gold' : (isBlack ? 'swatch-black' : 'swatch-silver');
          return `
            <div class="sava-swatch-item ${i === 0 ? 'active' : ''}" onclick="selectSwatch(this, '${c}')" title="${c}">
              <span class="swatch-color-box ${swatchClass}" style="${isBlack ? 'background:#18181b;' : ''}"></span>
              <span>${c}</span>
            </div>`;
        }).join('\n');

        html = html.replace(
          /<div class="sava-swatches">[\s\S]*?<\/div>/i,
          `<div class="sava-swatches">\n${swatchesHtml}\n          </div>`
        );
      }

      // 6. Pre-render Packages if present
      if (Array.isArray(product.packages) && product.packages.length > 0) {
        const pkgsHtml = product.packages.map((pkg, idx) => {
          const isPkgSold = Boolean(pkg.isSoldOut);
          const badgeHtml = isPkgSold
            ? `<span class="pkg-badge-black" style="background: #dc2626; color: #fff;">สินค้าหมด</span>`
            : (pkg.badge ? `<span class="pkg-badge-black">${pkg.badge}</span>` : '');
          const subLineClass = pkg.freeShipping ? 'free' : 'charge';
          const subText = pkg.subText || (pkg.freeShipping ? '✓ ฟรีค่าจัดส่งด่วนทั่วประเทศ' : '+ ค่าจัดส่งด่วน 50 ฿');
          const soldStyle = isPkgSold ? 'opacity: 0.55; cursor: not-allowed;' : '';
          const isSelected = idx === 1 || (idx === 0 && product.packages.length === 1);

          return `
            <div class="sava-pkg-card-luxury ${isSelected ? 'selected' : ''}" id="pkg_${idx}" style="${soldStyle}" onclick="selectDynamicPackage(${idx})">
              ${badgeHtml}
              <div class="pkg-header-row">
                <div class="pkg-title-wrap">
                  <div class="pkg-indicator-circle"></div>
                  <span class="pkg-name-text">${pkg.title}</span>
                </div>
                <div>
                  ${pkg.originalPrice ? `<span class="pkg-orig-text">${Number(pkg.originalPrice).toLocaleString()} ฿</span>` : ''}
                  <span class="pkg-price-text" style="color: #c5221f;">${Number(pkg.price).toLocaleString()} ฿</span>
                </div>
              </div>
              <div class="pkg-sub-line ${subLineClass}">
                ${subText}
              </div>
            </div>`;
        }).join('\n');

        html = html.replace(
          /<div class="sava-packages-luxury">[\s\S]*?<\/div>\s*<!-- 💥💥 BIG FEAR-BUSTER/i,
          `<div class="sava-packages-luxury">\n${pkgsHtml}\n        </div>\n\n        <!-- 💥💥 BIG FEAR-BUSTER`
        );
      }

      // 7. Inject Server-Rendered JSON Data in <head> for zero-delay hydration
      const safeJson = JSON.stringify(product).replace(/</g, '\\u003c');
      const hydrationScript = `<script id="serverProductData">window.__INITIAL_PRODUCT__ = ${safeJson};</script>`;
      html = html.replace('</head>', `  ${hydrationScript}\n</head>`);
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering product SSR:', err);
    return res.sendFile(path.join(__dirname, '../public/product.html'));
  }
});

// Home page route with Server-Side Hydration (zero flicker, immediate up-to-date products & images)
async function renderHomePage(req, res) {
  try {
    const [products, settings] = await Promise.all([
      store.getProducts().catch(() => []),
      store.getSettings().catch(() => ({}))
    ]);

    let html = getIndexHtmlTemplate();
    if (!html) {
      return res.sendFile(path.join(__dirname, '../public/index.html'));
    }

    // 1. Pre-render Bestsellers Grid with latest products
    if (Array.isArray(products) && products.length > 0) {
      const isThai = true;
      const cardsHtml = products.map(p => {
        const isSoldOut = Boolean(p.isSoldOut);
        const badgePill = isSoldOut
          ? `<span class="sava-badge-pill" style="background: #dc2626; color: #fff; border: 1px solid #b91c1c;">SOLD OUT</span>`
          : `<span class="sava-badge-pill">${p.badge || 'BESTSELLER'}</span>`;

        const origPriceHtml = p.originalPrice
          ? `<span class="orig-price" data-thb="${Number(p.originalPrice).toLocaleString()} ฿">${Number(p.originalPrice).toLocaleString()} ฿</span>`
          : '';

        const quickAddBtn = isSoldOut
          ? `<button type="button" class="sava-quick-add-btn" disabled style="background: #94a3b8; color: #fff; cursor: not-allowed; opacity: 0.85;">สินค้าหมด</button>`
          : `<button type="button" class="sava-quick-add-btn" data-i18n="quickAdd" onclick="event.preventDefault(); window.MinozaStore.addToCart('${p.id}')">ใส่ตะกร้า +</button>`;

        const soldOverlay = isSoldOut
          ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 13.5px; letter-spacing: 0.05em; z-index: 2; pointer-events: none;">สินค้าหมดชั่วคราว</div>`
          : '';

        const mainImg = p.image || '/images/jewelry/cross_chain_main.jpg';

        return `
      <!-- Product: ${p.name} -->
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
      </div>`;
      }).join('\n');

      html = html.replace(
        /<!-- START_BESTSELLERS_GRID -->[\s\S]*?<!-- END_BESTSELLERS_GRID -->/i,
        `<!-- START_BESTSELLERS_GRID -->\n    <div class="sava-product-grid" id="bestsellersGrid">\n${cardsHtml}\n    </div>\n    <!-- END_BESTSELLERS_GRID -->`
      );
    }

    // 2. Pre-render Dual Tiles & Hero from Live Settings
    if (settings && typeof settings === 'object') {
      if (settings.tiles) {
        if (settings.tiles.leftImage) {
          html = html.replace(/(<img\s+src=")[^"]*("\s+alt="Limited Edition Watches"[^>]*>)/i, `$1${settings.tiles.leftImage}$2`);
        }
        if (settings.tiles.rightImage) {
          html = html.replace(/(<img\s+src=")[^"]*("\s+alt="Bestseller Collection"[^>]*>)/i, `$1${settings.tiles.rightImage}$2`);
        }
      }
      if (settings.hero && settings.hero.bgImage) {
        html = html.replace(/(<section\s+class="sava-hero-section"[^>]*)>/i, `$1 style="background-image: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url('${settings.hero.bgImage}');">`);
      }
    }

    // 3. Inject Initial Hydration Script
    const safeProductsJson = JSON.stringify(products).replace(/</g, '\\u003c');
    const safeSettingsJson = JSON.stringify(settings || {}).replace(/</g, '\\u003c');
    const hydrationScript = `<script id="serverHomeData">window.__INITIAL_PRODUCTS__ = ${safeProductsJson}; window.__INITIAL_SETTINGS__ = ${safeSettingsJson};</script>`;
    html = html.replace('</head>', `  ${hydrationScript}\n</head>`);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering homepage SSR:', err);
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
}

app.get(['/', '/index.html'], renderHomePage);

// Fallback to index.html with SSR (Home Page)
app.get('*', renderHomePage);

module.exports = app;
