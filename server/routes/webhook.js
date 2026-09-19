const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { sendMetaPurchaseEvent } = require('../services/metaCapi');
const { createSupplierFulfillmentOrder } = require('../services/fulfillment');

async function saveOrderToDataStack(order) {
  try {
    await store.addOrder(order);
    return true;
  } catch (err) {
    console.error('Failed to save order to data stack:', err);
    return false;
  }
}

/**
 * Handle successful payment event and trigger complete Sales Stack
 */
async function processSuccessfulOrder({
  orderId,
  amount,
  customer,
  items,
  paymentMethod,
  paymentIntentId,
  utm = {},
  clientIp,
  userAgent,
  fbp,
  fbc,
  eventId
}) {
  console.log(`\n======================================================`);
  console.log(`🎉 [ORDER CONFIRMED] Order #${orderId} | Total: ฿${amount}`);
  console.log(`Customer: ${customer.name} | Phone: ${customer.phone}`);
  console.log(`Address: ${customer.address}, ${customer.province} ${customer.postalCode}`);
  console.log(`Payment: ${paymentMethod} (${paymentIntentId})`);
  console.log(`UTM Source: ${utm.source || 'meta'} | Campaign: ${utm.campaign || 'direct'}`);
  console.log(`======================================================\n`);

  // 1. Dispatch Automated Dropshipping Order to Supplier
  const fulfillmentResult = createSupplierFulfillmentOrder({
    orderId,
    customer,
    items
  });

  // 2. Dispatch Server-Side Meta Conversions API (CAPI) Purchase Event
  const capiResult = await sendMetaPurchaseEvent({
    orderId,
    amount,
    customer: { ...customer, items },
    clientIp,
    userAgent,
    fbp,
    fbc,
    eventId: eventId || `order_${orderId}`
  });

  // 3. Save to Sales Data Stack (orders.json)
  const orderRecord = {
    orderId,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    amount: parseFloat(amount),
    currency: 'THB',
    paymentMethod,
    paymentIntentId,
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      province: customer.province,
      postalCode: customer.postalCode
    },
    items,
    trackingNumber: fulfillmentResult.trackingNumber,
    estimatedDelivery: fulfillmentResult.estimatedDelivery,
    marketing: {
      utmSource: utm.source || 'meta',
      utmMedium: utm.medium || 'cpc',
      utmCampaign: utm.campaign || 'direct',
      utmContent: utm.content || '',
      fbc: fbc || '',
      fbp: fbp || '',
      metaCapiStatus: capiResult.success ? 'DISPATCHED' : 'FAILED'
    }
  };

  await saveOrderToDataStack(orderRecord);

  // 4. Simulated LINE Notify Alert
  console.log(`[LINE Notify Alert] 🔔 Sent: "🎉 ได้รับออเดอร์ใหม่ #${orderId} ยอด ฿${amount} จากแคมเปญ ${utm.campaign || 'Meta Ads'}"`);

  return {
    success: true,
    order: orderRecord
  };
}

/**
 * POST /api/confirm-order
 * Endpoint called upon successful client-side confirmation or sandbox test
 */
router.post('/confirm-order', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      customer,
      items,
      paymentMethod = 'PromptPay QR',
      paymentIntentId,
      utm = {},
      fbp,
      fbc,
      eventId
    } = req.body;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await processSuccessfulOrder({
      orderId,
      amount,
      customer,
      items,
      paymentMethod,
      paymentIntentId: paymentIntentId || `mock_pi_${orderId}`,
      utm,
      clientIp,
      userAgent,
      fbp,
      fbc,
      eventId
    });

    res.json({
      success: true,
      message: 'Order processed, CAPI event dispatched, and fulfillment triggered.',
      order: result.order
    });
  } catch (err) {
    console.error('Order confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/webhook/stripe
 * Live Stripe Webhook Listener
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && endpointSecret) {
    const stripe = require('stripe')(stripeKey);
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    event = req.body;
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log(`[Stripe Webhook] 💰 PaymentIntent was successful! (ID: ${paymentIntent.id})`);

    const metadata = paymentIntent.metadata || {};
    await processSuccessfulOrder({
      orderId: metadata.order_id || 'MNZ' + Date.now().toString().slice(-8),
      amount: paymentIntent.amount / 100,
      customer: {
        name: metadata.customer_name || 'Anonymous Customer',
        phone: metadata.customer_phone || '',
        address: metadata.customer_address || '',
        province: metadata.customer_province || '',
        postalCode: metadata.customer_postal || ''
      },
      items: [{ id: 'hero-product', name: 'Minoza Store Product', price: paymentIntent.amount / 100, quantity: 1 }],
      paymentMethod: paymentIntent.payment_method_types?.[0] === 'promptpay' ? 'PromptPay QR' : 'Credit Card',
      paymentIntentId: paymentIntent.id,
      utm: {
        source: metadata.utm_source,
        campaign: metadata.utm_campaign
      },
      eventId: metadata.event_id
    });
  }

  res.json({ received: true });
});

module.exports = router;
