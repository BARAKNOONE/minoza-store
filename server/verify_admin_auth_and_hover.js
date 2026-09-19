const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app');

let server;
const PORT = 3099;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      ...options
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING ADMIN AUTH, USERS MANAGEMENT & HOVER IMAGE VERIFICATION ===\n');

  // Start temporary test server
  await new Promise(res => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      res();
    });
  });

  try {
    // 1. Verify Data Stack removal
    console.log('1. Checking Storefront Data Stack removal...');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const productHtml = fs.readFileSync(path.join(__dirname, '../public/product.html'), 'utf8');

    if (indexHtml.includes('btn-data-stack') || indexHtml.includes('openAdminModal()')) {
      throw new Error('index.html still contains Data Stack button or openAdminModal');
    }
    if (indexHtml.includes('id="adminModal"') || indexHtml.includes('MINOZA Live Sales Data Stack')) {
      throw new Error('index.html still contains Data Stack modal');
    }
    if (productHtml.includes('btn-data-stack') || productHtml.includes('openAdminModal()')) {
      throw new Error('product.html still contains Data Stack button or openAdminModal');
    }
    if (productHtml.includes('id="adminModal"') || productHtml.includes('MINOZA Live Sales Data Stack')) {
      throw new Error('product.html still contains Data Stack modal');
    }
    console.log('✓ Storefront completely clean of Data Stack buttons and modals!');

    // 2. Verify Hover Image in Homepage HTML & CSS
    console.log('\n2. Checking Hover Image implementation in Storefront & CSS...');
    if (!indexHtml.includes('class="img-hover"')) {
      throw new Error('index.html static product cards are missing img-hover elements');
    }
    const css = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
    if (!css.includes('.sava-card-media .img-hover') || !css.includes('.sava-product-card:hover .sava-card-media .img-hover')) {
      throw new Error('style.css is missing .sava-card-media .img-hover hover swap rules');
    }
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    if (!appJs.includes('p.hoverImage ? `<img src="${p.hoverImage}" class="img-hover"')) {
      throw new Error('app.js renderCatalog is missing hoverImage rendering');
    }
    console.log('✓ Hover image HTML, CSS, and Dynamic JS rendering verified!');

    // 3. Verify Products API returns hoverImage
    console.log('\n3. Checking /api/products returns hoverImage...');
    const prodsRes = await request({ path: '/api/products', method: 'GET' });
    if (prodsRes.status !== 200 || !Array.isArray(prodsRes.json)) {
      throw new Error(`Failed to fetch /api/products: status ${prodsRes.status}`);
    }
    const crossChain = prodsRes.json.find(p => p.id === 'cross-chain');
    if (!crossChain || !crossChain.hoverImage) {
      throw new Error('Product cross-chain is missing hoverImage in API');
    }
    console.log(`✓ Products API verified! cross-chain hoverImage: ${crossChain.hoverImage}`);

    // 4. Verify Admin Auth: Login Failure & Success
    console.log('\n4. Checking Admin Login Authentication...');
    const failLogin = await request({
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'wrongpassword123' });

    if (failLogin.status !== 401) {
      throw new Error(`Expected 401 on wrong password, got ${failLogin.status}`);
    }
    console.log('✓ Rejected invalid login credentials with 401 correctly');

    const successLogin = await request({
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'minoza2026!' });

    if (successLogin.status !== 200 || !successLogin.json || !successLogin.json.token) {
      throw new Error(`Expected 200 and token on valid login, got ${successLogin.status} ${successLogin.body}`);
    }
    const adminToken = successLogin.json.token;
    console.log(`✓ Admin login successful! Token received: ${adminToken.slice(0, 20)}...`);

    // 5. Verify /api/admin/me
    console.log('\n5. Checking /api/admin/me session verification...');
    const unauthMe = await request({ path: '/api/admin/me', method: 'GET' });
    if (unauthMe.status !== 401) {
      throw new Error(`Expected 401 on unauthenticated /me, got ${unauthMe.status}`);
    }

    const authMe = await request({
      path: '/api/admin/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (authMe.status !== 200 || authMe.json.user.username !== 'admin') {
      throw new Error(`Expected valid user in /me, got ${authMe.status} ${authMe.body}`);
    }
    console.log('✓ /api/admin/me session successfully validated!');

    // 6. Verify Admin User Management (List, Create, Login with new user, Delete)
    console.log('\n6. Checking Admin User Management (CRUD)...');
    const usersList = await request({
      path: '/api/admin/users',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (usersList.status !== 200 || !Array.isArray(usersList.json.users)) {
      throw new Error(`Expected users list, got ${usersList.status}`);
    }
    console.log(`✓ Retrieved admin users list (${usersList.json.users.length} user(s))`);

    const newUsername = 'partner_admin_' + Date.now().toString().slice(-4);
    const createUser = await request({
      path: '/api/admin/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      username: newUsername,
      name: 'Partner Manager',
      password: 'newpassword123',
      role: 'admin'
    });

    if (createUser.status !== 201 || !createUser.json.user) {
      throw new Error(`Failed to create new admin user: ${createUser.status} ${createUser.body}`);
    }
    const createdId = createUser.json.user.id;
    console.log(`✓ Created new admin user "${newUsername}" (ID: ${createdId})`);

    // Test logging in with new user
    const newLogin = await request({
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: newUsername, password: 'newpassword123' });

    if (newLogin.status !== 200 || !newLogin.json.token) {
      throw new Error(`Failed to login with newly created admin user: ${newLogin.status}`);
    }
    console.log('✓ Successfully logged in with newly created admin account!');

    // Delete created test admin user
    const deleteRes = await request({
      path: `/api/admin/users/${createdId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (deleteRes.status !== 200 || !deleteRes.json.success) {
      throw new Error(`Failed to delete admin user: ${deleteRes.status} ${deleteRes.body}`);
    }
    console.log(`✓ Successfully deleted test admin user "${newUsername}"`);

    // Verify self-delete protection
    const selfDelete = await request({
      path: `/api/admin/users/admin-1`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (selfDelete.status === 200) {
      throw new Error('Self-delete or last admin deletion should have been blocked');
    }
    console.log('✓ Protection against deleting current/last admin verified!');

    console.log('\n======================================================');
    console.log('🎉 ALL 5 USER REQUIREMENTS PASSED 100% SUCCESFULLY!');
    console.log('======================================================');

  } finally {
    if (server) server.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
