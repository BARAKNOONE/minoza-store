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
  console.log('=== VERIFYING ADD TO BAG & CART DRAWER FLOW ===');
  const res = await fetchUrl('http://localhost:3000/product/cross-chain');
  console.log('PDP Status Code:', res.statusCode);

  const checks = [
    { name: 'Main CTA button is เพิ่มเข้าตะกร้า', pass: res.body.includes('id="btnMainOrder"') && res.body.includes('เพิ่มเข้าตะกร้า') },
    { name: 'Button calls addToBagFromPdp()', pass: res.body.includes('onclick="addToBagFromPdp()"') },
    { name: 'Cart Drawer present (cartDrawer & cartOverlay)', pass: res.body.includes('id="cartDrawer"') && res.body.includes('id="cartOverlay"') },
    { name: 'Cart BOGO Banner bar present', pass: res.body.includes('id="cartBogoBar"') && res.body.includes('id="bogoBannerText"') },
    { name: 'Cart Items List container present', pass: res.body.includes('id="cartItemsList"') },
    { name: 'In-Cart Upsell Carousel (YOU MAY LIKE) present', pass: res.body.includes('id="cartUpsellSection"') && res.body.includes('YOU MAY LIKE') && res.body.includes('id="upsellTrack"') },
    { name: 'Cart Drawer Savings row present', pass: res.body.includes('id="bogoSavingsRow"') && res.body.includes('id="cartDrawerSavings"') },
    { name: 'Cart Drawer Checkout button calls proceedToCheckoutFromDrawer()', pass: res.body.includes('onclick="proceedToCheckoutFromDrawer()"') && (res.body.includes('ดำเนินการชำระเงิน') || res.body.includes('PROCEED TO CHECKOUT')) },
    { name: 'addToBagFromPdp function defined', pass: res.body.includes('function addToBagFromPdp()') },
    { name: 'proceedToCheckoutFromDrawer function defined', pass: res.body.includes('function proceedToCheckoutFromDrawer()') },
    { name: 'Express Checkout Form present as target step', pass: res.body.includes('id="expressCheckoutSec"') && res.body.includes('id="expressOrderForm"') }
  ];

  let allPassed = true;
  checks.forEach(c => {
    if (c.pass) {
      console.log(`✅ ${c.name}`);
    } else {
      console.log(`❌ ${c.name}`);
      allPassed = false;
    }
  });

  if (!allPassed) {
    console.error('\nVerification failed!');
    process.exit(1);
  } else {
    console.log('\nAll Add-To-Bag & Cart Drawer flow checks PASSED 100%!');
  }
}

verify();
