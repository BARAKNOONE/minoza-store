async function testOrderFlow() {
  const fetch = globalThis.fetch;

  console.log('--- 1. Testing /api/create-payment-intent ---');
  const piRes = await fetch('http://localhost:3000/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        { id: 'cross-bracelet', name: 'CROSS BRACELET | SILVER', price: 1940, quantity: 1 },
        { id: 'crucifix-chain', name: 'CRUCIFIX CHAIN | SILVER', price: 2329, quantity: 1 }
      ],
      customer: {
        name: 'คุณสมชาย วิจิตรศิลป์',
        phone: '0891234567',
        address: '99/1 ซอยอารีย์สัมพันธ์ 1 ถนนพหลโยธิน แขวงพญาไท เขตพญาไท',
        province: 'กรุงเทพมหานคร',
        postalCode: '10400'
      },
      paymentMethod: 'promptpay',
      utm: {
        source: 'meta_ads',
        medium: 'reels',
        campaign: 'campaign_sava_jewelry_01'
      },
      eventId: 'evt_test_jewelry_001'
    })
  });
  const piData = await piRes.json();
  console.log('Payment Intent Created:', piData);

  console.log('\n--- 2. Testing /api/confirm-order (Simulating PromptPay Payment Success) ---');
  const confirmRes = await fetch('http://localhost:3000/api/confirm-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: piData.orderId,
      amount: piData.amount,
      customer: {
        name: 'คุณสมชาย วิจิตรศิลป์',
        phone: '0891234567',
        address: '99/1 ซอยอารีย์สัมพันธ์ 1 ถนนพหลโยธิน แขวงพญาไท เขตพญาไท',
        province: 'กรุงเทพมหานคร',
        postalCode: '10400'
      },
      items: [
        { id: 'cross-bracelet', name: 'CROSS BRACELET | SILVER', price: 1940, quantity: 1 },
        { id: 'crucifix-chain', name: 'CRUCIFIX CHAIN | SILVER', price: 2329, quantity: 1 }
      ],
      paymentMethod: 'PromptPay QR',
      utm: {
        source: 'meta_ads',
        campaign: 'campaign_winning_gadget_01'
      },
      eventId: 'evt_test_purchase_001'
    })
  });
  const confirmData = await confirmRes.json();
  console.log('Order Confirmation Result:', confirmData);

  console.log('\n--- 3. Testing /api/orders (Verifying Sales Data Stack) ---');
  const ordersRes = await fetch('http://localhost:3000/api/orders');
  const ordersData = await ordersRes.json();
  console.log('Orders Data Stack Status:', {
    totalOrders: ordersData.totalOrders,
    totalRevenue: ordersData.totalRevenue,
    campaignBreakdown: ordersData.campaignBreakdown,
    latestOrder: ordersData.orders[0]
  });
}

testOrderFlow().catch(console.error);
