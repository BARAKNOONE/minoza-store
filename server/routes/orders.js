const express = require('express');
const router = express.Router();
const store = require('../lib/store');

// Prevent caching on orders API calls
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

/**
 * GET /api/orders
 * Fetch sales data stack and metrics
 */
router.get('/orders', async (req, res) => {
  try {
    const orders = await store.getOrders();

    // Calculate quick marketing metrics
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const campaignBreakdown = {};
    orders.forEach(o => {
      const camp = o.marketing?.utmCampaign || 'Direct';
      campaignBreakdown[camp] = (campaignBreakdown[camp] || 0) + (o.amount || 0);
    });

    res.json({
      totalOrders: orders.length,
      totalRevenue,
      currency: 'THB',
      campaignBreakdown,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders/mock-test
 * Simulate a new incoming customer order for testing notifications & audio chime
 */
router.post('/orders/mock-test', async (req, res) => {
  try {
    const randomIdSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `MNZ${Date.now().toString().slice(-4)}${randomIdSuffix}`;
    const testNames = [
      'คุณสมชาย มุ่งมั่น', 'คุณวิภาวรรณ สดใส', 'คุณกิตติศักดิ์ พูลผล',
      'คุณนภัสสร รัตนโชติ', 'คุณปิยะวัฒน์ เจริญดี', 'คุณอังคณา มณีโชติ'
    ];
    const testProvinces = [
      'กรุงเทพมหานคร 10110', 'เชียงใหม่ 50200', 'ชลบุรี 20000',
      'นนทบุรี 11000', 'ขอนแก่น 40000', 'ภูเก็ต 83000'
    ];
    const sampleProducts = [
      { id: 'cross-chain', name: 'CROSS CHAIN สร้อยคอไม้กางเขน', price: 590, quantity: 1 },
      { id: 'cross-chain-duo', name: 'CROSS CHAIN (แพ็คคู่ 2 เส้น)', price: 990, quantity: 1 },
      { id: 'silver-bracelet', name: 'สร้อยข้อมือ Minimal Silver', price: 490, quantity: 1 }
    ];

    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    const randomLocation = testProvinces[Math.floor(Math.random() * testProvinces.length)];
    const selectedProduct = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
    const randomPhone = `08${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newOrder = {
      orderId,
      trackingNumber: '',
      createdAt: new Date().toISOString(),
      customer: {
        name: randomName,
        phone: randomPhone,
        email: `${orderId.toLowerCase()}@customer.com`,
        address: `123/45 ซอยสุขุมวิท ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย ${randomLocation}`
      },
      items: [selectedProduct],
      amount: selectedProduct.price,
      currency: 'THB',
      paymentMethod: Math.random() > 0.4 ? 'cod' : 'promptpay',
      paymentStatus: Math.random() > 0.4 ? 'PENDING_CASH_ON_DELIVERY' : 'PAID',
      fulfillmentStatus: 'PENDING_SHIPMENT',
      marketing: {
        utmSource: 'facebook_ads',
        utmCampaign: 'test_simulation',
        eventId: `evt_${orderId}`
      }
    };

    await store.addOrder(newOrder);

    res.status(201).json({
      success: true,
      message: 'New test order generated successfully',
      order: newOrder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/orders/:orderId
 * Update order status, payment status, tracking number, or notes
 */
router.patch('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, fulfillmentStatus, trackingNumber, notes } = req.body;

    const patchData = {};
    if (paymentStatus !== undefined) patchData.paymentStatus = paymentStatus;
    if (fulfillmentStatus !== undefined) patchData.fulfillmentStatus = fulfillmentStatus;
    if (trackingNumber !== undefined) patchData.trackingNumber = trackingNumber;
    if (notes !== undefined) patchData.notes = notes;

    const updated = await store.updateOrder(orderId, patchData);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/orders/:orderId
 * Delete a specific order
 */
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const ok = await store.deleteOrder(orderId);
    res.json({
      success: true,
      message: `Order ${orderId} deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders/reset
 * Reset mock orders & revenue back to zero
 */
router.post('/orders/reset', async (req, res) => {
  try {
    await store.clearOrders();
    res.json({
      success: true,
      message: 'Orders and revenue reset to 0 successfully',
      totalOrders: 0,
      totalRevenue: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

