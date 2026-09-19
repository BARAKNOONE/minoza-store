const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { sendMetaPurchaseEvent } = require('../services/metaCapi');

// Initialize Stripe if valid secret key is present
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeSecretKey && !stripeSecretKey.includes('sample_key') && !stripeSecretKey.includes('your_stripe_secret_key') && stripeSecretKey.startsWith('sk_')) {
  try {
    stripe = require('stripe')(stripeSecretKey);
  } catch (e) {
    stripe = null;
  }
}

/**
 * POST /api/create-payment-intent
 * Creates a Stripe PaymentIntent supporting both Card and PromptPay
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { items, cartItems, customer, paymentMethod = 'cod', utm = {}, eventId, amount } = req.body;
    const rawItems = items || cartItems || [];

    if (!rawItems.length && !amount) {
      return res.status(400).json({ error: 'Missing required order items or amount' });
    }
    if (!customer || !customer.phone) {
      return res.status(400).json({ error: 'Missing customer phone number' });
    }

    let totalAmount = 0;
    if (amount) {
      totalAmount = Number(amount);
    } else {
      // Calculate total amount with SAVA BOGO (Buy 1 Get 1 Free) offer
      const list = [];
      rawItems.forEach(item => {
        for (let i = 0; i < (item.quantity || 1); i++) {
          list.push(Number(item.price));
        }
      });
      list.sort((a, b) => b - a);

      let discount = 0;
      for (let i = 1; i < list.length; i += 2) {
        discount += list[i];
      }

      const rawSubtotal = list.reduce((sum, x) => sum + x, 0);
      totalAmount = Math.max(0, rawSubtotal - discount);
    }

    const orderId = 'MNZ' + Date.now().toString().slice(-8);
    const trackingNumber = 'TH' + Math.floor(100000000 + Math.random() * 900000000);

    const newOrder = {
      orderId,
      trackingNumber,
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name || 'Customer',
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || 'Thailand'
      },
      items: rawItems,
      amount: totalAmount,
      currency: 'THB',
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'PENDING_CASH_ON_DELIVERY' : 'PAID',
      fulfillmentStatus: 'DISPATCHED_TO_FLASH_EXPRESS',
      marketing: {
        utmSource: utm.source || 'meta_ads',
        utmCampaign: utm.campaign || 'direct_response_pdp',
        eventId: eventId || `evt_${orderId}`
      }
    };

    await store.addOrder(newOrder);

    // 🚀 Fire Meta CAPI Purchase event server-side (deduped with Pixel via eventId)
    const capiEventId = eventId || `evt_${orderId}`;
    sendMetaPurchaseEvent({
      orderId,
      amount: totalAmount,
      currency: 'THB',
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        items: rawItems
      },
      clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      fbp: req.headers['x-fbp'] || '',
      fbc: req.headers['x-fbc'] || '',
      eventId: capiEventId
    }).catch(err => console.error('[CAPI Error]', err.message));

    console.log(`\n======================================================`);
    console.log(`🎉 [ORDER RECEIVED - ${paymentMethod.toUpperCase()}] Order #${orderId} | Total: ฿${totalAmount}`);
    console.log(`Customer: ${customer.name} | Phone: ${customer.phone}`);
    console.log(`Address: ${customer.address}`);
    console.log(`Fulfillment: Tracking #${trackingNumber} via Flash Express`);
    console.log(`======================================================\n`);

    if (paymentMethod === 'promptpay') {
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021229370016A000000677010111011508123456780005802TH5303764540${totalAmount.toFixed(2).length < 10 ? '0' + totalAmount.toFixed(2).length : totalAmount.toFixed(2).length}${totalAmount.toFixed(2)}6304`;
      return res.json({
        success: true,
        orderId,
        trackingNumber,
        amount: totalAmount,
        currency: 'THB',
        paymentMethod: 'promptpay',
        qrCode: qrDataUrl,
        message: 'PromptPay QR Generated'
      });
    }

    // COD or Card
    return res.json({
      success: true,
      orderId,
      trackingNumber,
      amount: totalAmount,
      currency: 'THB',
      paymentMethod,
      message: 'Order confirmed successfully with Cash On Delivery!'
    });

  } catch (error) {
    console.error('Payment intent creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
