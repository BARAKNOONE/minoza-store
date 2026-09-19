const express = require('express');
const router = express.Router();
const store = require('../lib/store');

// Prevent caching on settings API calls
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

/**
 * GET /api/settings/homepage
 */
router.get('/homepage', async (req, res) => {
  try {
    const settings = await store.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/settings/homepage
 */
router.put('/homepage', async (req, res) => {
  try {
    const updated = await store.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
