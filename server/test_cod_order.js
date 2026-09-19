const http = require('http');

const data = JSON.stringify({
  amount: 890,
  paymentMethod: 'cod',
  customer: {
    name: 'คุณสมชาย ยอดนักช้อป',
    phone: '0891234567',
    address: '123/45 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110'
  },
  cartItems: [
    {
      id: 'cross-chain',
      name: 'CROSS CHAIN | SILVER (เซ็ตคู่ 2 เส้น Buy 1 Get 1 Free)',
      price: 890,
      quantity: 2
    }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/create-payment-intent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', JSON.parse(responseData));
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
