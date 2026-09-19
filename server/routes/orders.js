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
