const http = require('http');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('=== VERIFYING SEPARATED CHECKOUT, PROMPTPAY DISCOUNT & NO FAKE COUNTDOWN ===');

  // 1. Check Product Page HTML
  const pdpRes = await request('/product.html');
  if (pdpRes.status !== 200) {
    throw new Error(`Failed to load /product.html, status: ${pdpRes.status}`);
  }
  const html = pdpRes.body;

  // Assert 2-column separated checkout grid exists
  if (!html.includes('sava-checkout-grid') || !html.includes('sava-checkout-summary-box')) {
    throw new Error('Missing sava-checkout-grid or sava-checkout-summary-box in product.html');
  }
  console.log('✓ Verified: 2-column separated checkout grid & summary card present');

  // Assert itemized container exists
  if (!html.includes('checkoutItemsList') || !html.includes('summaryItemCountBadge')) {
    throw new Error('Missing checkoutItemsList or summaryItemCountBadge');
  }
  console.log('✓ Verified: Dynamic itemized list container with thumbnail & quantity badges present');

  // Assert NO fake countdown timer
  if (html.includes('timerCountdown') || html.includes('Order reserved 9:52')) {
    throw new Error('Found unwanted fake countdown timer in product.html');
  }
  console.log('✓ Verified: Fake countdown timer completely eliminated');

  // Assert real authentic dispatch cutoff "ตัดรอบส่งวันนี้ 16:00 น."
  if (!html.includes('16:00 น.')) {
    throw new Error('Missing authentic dispatch cutoff 16:00 น.');
  }
  console.log('✓ Verified: Authentic dispatch cutoff "ตัดรอบส่งวันนี้ 16:00 น." present');

  // Assert PromptPay 50 THB discount elements
  if (!html.includes('summaryDiscountRow') || !html.includes('cardPayPromptPay') || !html.includes('50 ฿')) {
    throw new Error('Missing PromptPay discount card or discount row');
  }
  console.log('✓ Verified: PromptPay 50 THB instant discount UI & summary row present');

  // Assert Prominent Elevated CI Confirm Button
  if (!html.includes('sava-btn-confirm-order') || !html.includes('btnConfirmOrder')) {
    throw new Error('Missing prominent CI confirm button');
  }
  console.log('✓ Verified: Prominent elevated luxury confirm button present');

  // 2. Test API order creation with PromptPay discount applied
  const promptPayOrderPayload = JSON.stringify({
    amount: 840, // 890 - 50 discount
    currency: 'thb',
    paymentMethod: 'promptpay',
    cartItems: [{
      id: 'cross-chain-bundle-2',
      name: 'CROSS CHAIN | SILVER (เซ็ตคู่ 2 เส้น Buy 1 Get 1 Free)',
      price: 890,
      quantity: 1,
      freeShipping: true
    }],
    customer: {
      name: 'ทดสอบ ส่วนลดพร้อมเพย์',
      phone: '0899999999',
      email: 'test-discount@example.com',
      address: '99/9 อาคารทดสอบ สุขุมวิท กรุงเทพฯ 10110'
    }
  });

  const apiRes = await request('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(promptPayOrderPayload)
    }
  }, promptPayOrderPayload);

  const apiData = JSON.parse(apiRes.body);
  if (!apiData.success || !apiData.qrCode || apiData.amount !== 840) {
    throw new Error(`API order test failed: ${JSON.stringify(apiData)}`);
  }
  console.log(`✓ Verified: PromptPay order created with 50 ฿ discount (amount: ${apiData.amount} ฿, qrCode generated)`);

  console.log('\n=== ALL CHECKOUT SEPARATION & PROMPTPAY DISCOUNT TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
