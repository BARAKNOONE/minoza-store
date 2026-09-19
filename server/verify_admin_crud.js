const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function verifyAdmin() {
  console.log('=== VERIFYING ADMIN PRODUCT MANAGEMENT SYSTEM ===');

  // 1. Verify GET /admin HTML
  const adminPage = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin',
    method: 'GET'
  });

  if (adminPage.status !== 200) {
    throw new Error(`/admin returned status ${adminPage.status}`);
  }
  if (!adminPage.body.includes('ADMIN CONSOLE') || !adminPage.body.includes('id="productsTableBody"') || !adminPage.body.includes('id="productModal"')) {
    throw new Error('/admin is missing core UI components');
  }
  console.log('✓ 1. Admin Page (/admin) loaded successfully with Stats, Table & Modal');

  // 2. Verify GET /api/products
  const listRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET'
  });
  if (listRes.status !== 200) {
    throw new Error(`GET /api/products returned status ${listRes.status}`);
  }
  const products = JSON.parse(listRes.body);
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('GET /api/products did not return product array');
  }
  console.log(`✓ 2. GET /api/products returned ${products.length} products`);

  // 3. Test POST /api/products (Create)
  const testSlug = 'test-silver-ring-' + Date.now();
  const createPayload = {
    name: 'TEST LUXURY SILVER RING',
    slug: testSlug,
    category: 'Rings & Bands',
    price: 1290,
    originalPrice: 1990,
    badge: 'NEW',
    image: '/images/jewelry/cross_chain_main.jpg',
    tagline: 'Handcrafted test silver ring',
    description: 'Surgical grade 316L stainless steel ring'
  };

  const createRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, createPayload);

  if (createRes.status !== 201) {
    throw new Error(`POST /api/products failed with status ${createRes.status}: ${createRes.body}`);
  }
  const createdJson = JSON.parse(createRes.body);
  if (!createdJson.success || createdJson.product.slug !== testSlug) {
    throw new Error('Created product slug mismatch');
  }
  console.log('✓ 3. POST /api/products successfully created new product:', createdJson.product.name);

  // 4. Test GET /api/products/:id
  const getSingle = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${testSlug}`,
    method: 'GET'
  });
  if (getSingle.status !== 200) {
    throw new Error(`GET /api/products/${testSlug} failed with status ${getSingle.status}`);
  }
  const singleJson = JSON.parse(getSingle.body);
  if (singleJson.price !== 1290) {
    throw new Error('Single product price mismatch');
  }
  console.log('✓ 4. GET /api/products/:id fetched the newly created product');

  // 5. Test PUT /api/products/:id (Update)
  const updatePayload = {
    name: 'TEST LUXURY SILVER RING (UPDATED)',
    price: 1490,
    badge: 'BESTSELLER'
  };
  const updateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${testSlug}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, updatePayload);

  if (updateRes.status !== 200) {
    throw new Error(`PUT /api/products/${testSlug} failed with status ${updateRes.status}`);
  }
  const updatedJson = JSON.parse(updateRes.body);
  if (updatedJson.product.price !== 1490 || updatedJson.product.badge !== 'BESTSELLER') {
    throw new Error('Product update did not persist new price or badge');
  }
  console.log('✓ 5. PUT /api/products/:id updated price to 1,490 ฿ and badge to BESTSELLER');

  // 6. Test DELETE /api/products/:id (Delete)
  const deleteRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${testSlug}`,
    method: 'DELETE'
  });
  if (deleteRes.status !== 200) {
    throw new Error(`DELETE /api/products/${testSlug} failed with status ${deleteRes.status}`);
  }
  const deleteJson = JSON.parse(deleteRes.body);
  if (!deleteJson.success) {
    throw new Error('Delete response indicated failure');
  }
  console.log('✓ 6. DELETE /api/products/:id successfully deleted the test product');

  // 7. Verify deletion
  const verifyDeleted = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/products/${testSlug}`,
    method: 'GET'
  });
  if (verifyDeleted.status !== 404) {
    throw new Error(`Deleted product still returned status ${verifyDeleted.status} instead of 404`);
  }
  console.log('✓ 7. Verified product is 404 Not Found after deletion');

  console.log('\n=== ALL ADMIN PRODUCT MANAGEMENT CRUD TESTS PASSED 100%! ===');
}

verifyAdmin().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
