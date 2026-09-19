const crypto = require('crypto');

/**
 * SHA-256 Hashing helper as required by Meta Conversions API
 */
function hashData(input) {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize Thai phone number to international format (66xxxxxxxxx)
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '66' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Send Purchase Event to Meta Conversions API (CAPI)
 */
async function sendMetaPurchaseEvent({
  orderId,
  amount,
  currency = 'THB',
  customer,
  clientIp,
  userAgent,
  fbp,
  fbc,
  eventId
}) {
  const pixelId = process.env.META_PIXEL_ID || 'MOCK_PIXEL_ID';
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  const normalizedPhone = normalizePhone(customer.phone);
  const nameParts = (customer.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  // Build high EMQ (Event Match Quality) User Data
  const userData = {
    ph: [hashData(normalizedPhone)],
    em: [hashData(customer.email || `${normalizedPhone}@minozastore.com`)],
    fn: [hashData(firstName)],
    ln: [hashData(lastName)],
    ct: [hashData(customer.province || 'bangkok')],
    zp: [hashData(customer.postalCode || '10110')],
    country: [hashData('th')],
    client_ip_address: clientIp || '127.0.0.1',
    client_user_agent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };

  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const eventPayload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `order_${orderId}`,
        event_source_url: `https://minozastore.com/checkout/success?order_id=${orderId}`,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: currency,
          value: parseFloat(amount),
          order_id: orderId,
          content_type: 'product',
          contents: (customer.items || []).map(item => ({
            id: item.id,
            quantity: item.quantity || 1,
            item_price: item.price
          }))
        }
      }
    ]
  };

  console.log(`[Meta CAPI] 🚀 Dispatching Purchase event for Order #${orderId} (Amount: ฿${amount})`);
  console.log(`[Meta CAPI] Event ID: ${eventId}, EMQ Match Fields: Phone, Name, City, IP, UA`);

  if (!accessToken || pixelId === 'MOCK_PIXEL_ID') {
    console.log(`[Meta CAPI - Demo Mode] Simulated successfully! (Add META_PIXEL_ID and META_CAPI_ACCESS_TOKEN in .env for production)`);
    return { success: true, mode: 'simulated', eventId, payload: eventPayload };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });
    const result = await response.json();
    console.log(`[Meta CAPI Response]`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`[Meta CAPI Error]`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendMetaPurchaseEvent,
  hashData,
  normalizePhone
};
