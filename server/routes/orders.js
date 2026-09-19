const express = require('express');
const router = express.Router();
const store = require('../lib/store');

/**
 * GET /api/products
 * Fetch store product catalog
 */
router.get('/products', async (req, res) => {
  try {
    const products = await store.getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

module.exports = router;
