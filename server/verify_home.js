const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- VERIFYING MINOZA HOME PAGE (SAVA STYLE) ---');
  const res = await fetchUrl('http://localhost:3000/');
  console.log('Status Code:', res.statusCode);
  
  const tests = [
    { name: 'MINOZA Logo', pass: res.body.includes('MINOZA') && res.body.includes('THAILAND BRAND') },
    { name: 'Hero Yacht Model Banner', pass: res.body.includes('hero_yacht_model.jpg') },
    { name: 'Hero Headline (Thai Default with i18n)', pass: res.body.includes('โปรโมชั่น 1 แถม 1 ฟรี') },
    { name: 'Hero Guarantees (1 แถม 1 ฟรี, รับประกันตลอดชีพ, จัดส่งฟรีทั่วไทย)', pass: res.body.includes('1 แถม 1 ฟรี') && res.body.includes('รับประกันตลอดชีพ') && res.body.includes('จัดส่งฟรีทั่วไทย') },
    { name: 'Golden Marquee Ticker (Thai Default)', pass: res.body.includes('sava-marquee-bar') && res.body.includes('ซื้อ 1 แถม 1 ฟรี (BUY 1 GET 1 FREE)') },
    { name: 'Dual Tiles (Limited & Bestseller)', pass: res.body.includes('banner_limited_watch.jpg') && res.body.includes('banner_bestsellers_villa.jpg') },
    { name: 'Four Value Props (จัดส่งด่วนฟรี, รับประกันตลอดชีพ, THAILAND BRAND, ใส่ได้ทุกวัน)', pass: res.body.includes('จัดส่งด่วนฟรี') && res.body.includes('รับประกันตลอดชีพ') && res.body.includes('THAILAND BRAND') && res.body.includes('ใส่ได้ทุกวัน') },
    { name: 'Best Sellers 4-Col Grid (8 Items)', pass: 
      res.body.includes('RIVIERA | SILVER') &&
      res.body.includes('MINOZA ONE WHITE | SILVER') &&
      res.body.includes('CROSS CHAIN | SILVER') &&
      res.body.includes('CROSS BRACELET | SILVER') &&
      res.body.includes('ROPE CHAIN 3MM | SILVER') &&
      res.body.includes('GREEN GEMSTONE CHAIN | 18K GOLD') &&
      res.body.includes('ROPE BRACELET 3MM | SILVER') &&
      res.body.includes('OCEAN CLOVER BRACELET | SILVER')
    },
    { name: 'Slide-Out Cart Drawer & BOGO Bar', pass: res.body.includes('cart-bogo-bar') && res.body.includes('cartDrawer') },
    { name: 'PromptPay QR & Stripe Checkout', pass: res.body.includes('mPromptPayArea') && res.body.includes('expressCheckoutForm') }
  ];

  let allPassed = true;
  tests.forEach(t => {
    console.log(`${t.pass ? '✅' : '❌'} ${t.name}`);
    if (!t.pass) allPassed = false;
  });

  console.log('\nFinal Verification Result:', allPassed ? 'ALL TESTS PASSED PERFECTLY!' : 'SOME TESTS FAILED');
}

verify();
