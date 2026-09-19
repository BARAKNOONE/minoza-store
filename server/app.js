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

// Admin Dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Product details route
app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/product.html'));
});

// Fallback to index.html (Home Page)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
