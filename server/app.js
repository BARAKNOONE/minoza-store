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

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '../public')));

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

// Product details route with Server-Side Hydration (zero flicker, zero delay)
app.get(['/product/:id', '/product/:id/*'], async (req, res) => {
  try {
    const rawId = req.params.id ? String(req.params.id).replace(/\/+$/, '').trim() : '';
    const product = await store.getProduct(rawId);
    const htmlPath = path.join(__dirname, '../public/product.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

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

// Fallback to index.html (Home Page)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
