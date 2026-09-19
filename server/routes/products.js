const express = require('express');
const router = express.Router();
const store = require('../lib/store');

// Prevent caching on all product API calls
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

/**
 * GET /api/products
 * Fetch all products
 */
router.get('/', async (req, res) => {
  try {
    const products = await store.getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Fetch single product by id or slug
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await store.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      shortName,
      slug,
      badge,
      category,
      price,
      originalPrice,
      image,
      gallery,
      tagline,
      description,
      material,
      colors,
      packages,
      bundle2Title,
      bundle2Price,
      bundle2Savings
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    // Auto-generate slug and id if not provided
    const generatedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `prod-${Date.now()}`;
    const id = generatedSlug;

    // Check duplicate
    if (await store.productExists(id, generatedSlug)) {
      return res.status(400).json({ error: `Product with slug "${generatedSlug}" already exists` });
    }

    const mainImg = image || '/images/jewelry/cross_chain_main.jpg';
    let galleryArr = Array.isArray(gallery) && gallery.length > 0 ? gallery : [mainImg];
    if (!galleryArr.includes(mainImg)) {
      galleryArr.unshift(mainImg);
    }

    // Process packages
    let finalPackages = Array.isArray(packages) && packages.length > 0 ? packages : [
      {
        id: 1,
        title: `ซื้อ 1 ชิ้น (${Number(price).toLocaleString()} ฿)`,
        qty: 1,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.3),
        badge: '',
        freeShipping: false,
        subText: '+ ค่าจัดส่งด่วน 50 ฿'
      },
      {
        id: 2,
        title: bundle2Title || '2 ชิ้น — ซื้อ 1 แถม 1 ฟรี',
        qty: 2,
        price: bundle2Price !== undefined ? Number(bundle2Price) : Number(price),
        originalPrice: (originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.3)) * 2,
        badge: 'BESTSELLER / คู่คุ้มสุด',
        freeShipping: true,
        subText: '✓ ฟรีค่าจัดส่งด่วนทั่วประเทศ'
      }
    ];

    const newProduct = {
      id,
      slug: generatedSlug,
      name: name.trim(),
      shortName: shortName ? shortName.trim() : name.trim(),
      badge: badge || 'NEW',
      category: category || 'Jewelry',
      rating: 5.0,
      reviewCount: 0,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.3),
      image: mainImg,
      gallery: galleryArr,
      tagline: tagline || '',
      description: description || '',
      material: material || 'พรีเมียม 316L Stainless Steel (กันน้ำ 100%)',
      colors: Array.isArray(colors) ? colors : (typeof colors === 'string' ? colors.split(',').map(s => s.trim()) : ['Silver', '18K Gold']),
      packages: finalPackages,
      bundle1Title: `ซื้อ 1 ชิ้น (${Number(price).toLocaleString()} ฿)`,
      bundle2Title: bundle2Title || 'โปรโมชั่น 1 แถม 1 ฟรี (BOGO Offer)',
      bundle2Price: bundle2Price !== undefined ? Number(bundle2Price) : Number(price),
      bundle2Savings: bundle2Savings !== undefined ? Number(bundle2Savings) : Number(price),
      isSoldOut: req.body.isSoldOut === true || req.body.inStock === false ? true : false,
      inStock: !(req.body.isSoldOut === true || req.body.inStock === false),
      bundle2Bullets: [
        'ซื้อชิ้นที่ 1 รับชิ้นที่ 2 ฟรีทันที',
        'จัดส่งฟรีด่วนทั่วประเทศ',
        'รับประกันสินค้าแท้ 100%'
      ],
      createdAt: new Date().toISOString()
    };

    await store.createProduct(newProduct);

    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Update an existing product
 */
router.put('/:id', async (req, res) => {
  try {
    const current = await store.getProduct(req.params.id);

    if (!current) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const {
      name,
      shortName,
      badge,
      category,
      price,
      originalPrice,
      image,
      gallery,
      tagline,
      description,
      material,
      colors,
      packages,
      bundle2Title,
      bundle2Price,
      bundle2Savings
    } = req.body;

    const mainImg = image !== undefined ? image.trim() : current.image;
    let galleryArr = current.gallery || [];
    if (Array.isArray(gallery)) {
      galleryArr = gallery;
    }
    if (mainImg && !galleryArr.includes(mainImg)) {
      galleryArr.unshift(mainImg);
    }

    const updatedProduct = {
      ...current,
      name: name !== undefined ? name.trim() : current.name,
      shortName: shortName !== undefined ? shortName.trim() : current.shortName,
      badge: badge !== undefined ? badge : current.badge,
      category: category !== undefined ? category : current.category,
      price: price !== undefined ? Number(price) : current.price,
      originalPrice: originalPrice !== undefined ? Number(originalPrice) : current.originalPrice,
      image: mainImg,
      gallery: galleryArr,
      tagline: tagline !== undefined ? tagline : current.tagline,
      description: description !== undefined ? description : current.description,
      material: material !== undefined ? material : (current.material || 'พรีเมียม 316L Stainless Steel (กันน้ำ 100%)'),
      colors: colors !== undefined ? (Array.isArray(colors) ? colors : colors.split(',').map(s => s.trim())) : (current.colors || ['Silver', '18K Gold']),
      packages: packages !== undefined ? packages : current.packages,
      bundle2Title: bundle2Title !== undefined ? bundle2Title : current.bundle2Title,
      bundle2Price: bundle2Price !== undefined ? Number(bundle2Price) : current.bundle2Price,
      bundle2Savings: bundle2Savings !== undefined ? Number(bundle2Savings) : current.bundle2Savings,
      isSoldOut: req.body.isSoldOut !== undefined ? Boolean(req.body.isSoldOut) : (req.body.inStock !== undefined ? !req.body.inStock : (current.isSoldOut || false)),
      inStock: req.body.inStock !== undefined ? Boolean(req.body.inStock) : (req.body.isSoldOut !== undefined ? !req.body.isSoldOut : (current.inStock !== undefined ? current.inStock : true)),
      updatedAt: new Date().toISOString()
    };

    await store.updateProduct(req.params.id, updatedProduct);

    res.json({ success: true, product: updatedProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/products/:id/toggle-stock
 * Quick toggle sold out / in stock status
 */
router.patch('/:id/toggle-stock', async (req, res) => {
  try {
    const current = await store.getProduct(req.params.id);

    if (!current) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const newSoldOut = !current.isSoldOut;
    current.isSoldOut = newSoldOut;
    current.inStock = !newSoldOut;
    current.updatedAt = new Date().toISOString();

    await store.updateProduct(req.params.id, current);

    res.json({ success: true, isSoldOut: newSoldOut, inStock: !newSoldOut, product: current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deleteProduct(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
