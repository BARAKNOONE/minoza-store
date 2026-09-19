/**
 * Verification script for Orders PWA routes and APIs
 */
const http = require('http');
const app = require('./app');

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[TEST] Test server listening on ${baseUrl}`);

  try {
    // 1. Test /orders route (HTML)
    const resOrdersHtml = await fetch(`${baseUrl}/orders`);
    console.log(`1. GET /orders: status ${resOrdersHtml.status}`);
    const textHtml = await resOrdersHtml.text();
    if (!textHtml.includes('MINOZA ORDERS') || !textHtml.includes('iosNotificationBanner')) {
      throw new Error('/orders did not return expected HTML content');
    }
    console.log('   ✓ /orders HTML loaded successfully');

    // 2. Test /manifest.json
    const resManifest = await fetch(`${baseUrl}/manifest.json`);
    console.log(`2. GET /manifest.json: status ${resManifest.status}`);
    const manifestJson = await resManifest.json();
    if (manifestJson.short_name !== 'Minoza Orders') {
      throw new Error('manifest.json has incorrect short_name');
    }
    console.log('   ✓ manifest.json is valid');

    // 3. Test /sw.js
    const resSw = await fetch(`${baseUrl}/sw.js`);
    console.log(`3. GET /sw.js: status ${resSw.status}`);
    const swText = await resSw.text();
    if (!swText.includes('CACHE_NAME')) {
      throw new Error('sw.js missing cache logic');
    }
    console.log('   ✓ Service Worker file is valid');

    // 4. Test GET /api/orders
    const resGetOrders = await fetch(`${baseUrl}/api/orders`);
    const ordersData = await resGetOrders.json();
    console.log(`4. GET /api/orders: status ${resGetOrders.status}, total: ${ordersData.totalOrders}`);
    console.log('   ✓ GET /api/orders returned valid JSON');

    // 5. Test POST /api/orders/mock-test
    const resMock = await fetch(`${baseUrl}/api/orders/mock-test`, { method: 'POST' });
    const mockData = await resMock.json();
    console.log(`5. POST /api/orders/mock-test: status ${resMock.status}, orderId: ${mockData.order?.orderId}`);
    if (!mockData.success || !mockData.order?.orderId) {
      throw new Error('Mock order creation failed');
    }
    const testOrderId = mockData.order.orderId;
    console.log('   ✓ Mock order created successfully:', testOrderId);

    // 6. Test PATCH /api/orders/:orderId
    const resPatch = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingNumber: 'TH-FLASH-999888',
        fulfillmentStatus: 'DISPATCHED_TO_FLASH_EXPRESS'
      })
    });
    const patchData = await resPatch.json();
    console.log(`6. PATCH /api/orders/${testOrderId}: status ${resPatch.status}`);
    if (patchData.order?.trackingNumber !== 'TH-FLASH-999888') {
      throw new Error('Patch order tracking number mismatch');
    }
    console.log('   ✓ Order patched successfully with tracking number');

    // 7. Test DELETE /api/orders/:orderId
    const resDel = await fetch(`${baseUrl}/api/orders/${testOrderId}`, { method: 'DELETE' });
    const delData = await resDel.json();
    console.log(`7. DELETE /api/orders/${testOrderId}: status ${resDel.status}`);
    if (!delData.success) {
      throw new Error('Delete order failed');
    }
    console.log('   ✓ Order deleted successfully');

    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
