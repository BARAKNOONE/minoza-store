const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ code: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ code: 500, error: e.message }));
  });
}

async function verifyAll() {
  console.log('=== VERIFYING PRODUCT LANDING PAGE & GALLERY CAROUSEL ===');
  const page = await check('http://localhost:3000/product/cross-chain');
  console.log('Page Status Code:', page.code);

  const tests = [
    { name: 'Gallery Carousel Viewport & Track', pass: page.body.includes('sava-carousel-viewport') && page.body.includes('sava-carousel-track') },
    { name: 'Next / Prev Arrow Buttons (< and >)', pass: page.body.includes('sava-carousel-arrow prev') && page.body.includes('sava-carousel-arrow next') },
    { name: 'Total 8 Slides in Track', pass: (page.body.match(/sava-carousel-slide/g) || []).length === 8 },
    { name: 'Total 8 Thumbnails in Strip', pass: (page.body.match(/class="[^"]*sava-thumb-btn/g) || []).length === 8 },
    { name: 'Interactive Slider JS Functions (slideGallery, goToSlide)', pass: page.body.includes('function slideGallery') && page.body.includes('function goToSlide') },
    { name: 'Cohesive Luxury CI: Fear Busters (COD & Free Shipping)', pass: page.body.includes('sava-fear-card-luxury') && page.body.includes('เก็บเงินปลายทาง (COD)') && page.body.includes('จัดส่งฟรีทั่วไทย') },
    { name: 'Cohesive Luxury CI: Package Selector (590 B / 890 B)', pass: page.body.includes('sava-pkg-card-luxury') && page.body.includes('590 ฿') && page.body.includes('890 ฿') },
    { name: 'Cohesive Luxury CI: Timer & BOGO Bar', pass: page.body.includes('sava-bogo-bar-luxury') && page.body.includes('sava-dispatch-timer-luxury') },
    { name: 'Cohesive Luxury CI: Main Button & Scarcity', pass: page.body.includes('sava-btn-cta-luxury') && page.body.includes('sava-stock-line-luxury') },
    { name: 'Express 1-Page COD Order Form', pass: page.body.includes('expressOrderForm') && page.body.includes('Confirm COD Order') }
  ];

  let allPass = true;
  tests.forEach(t => {
    console.log(`${t.pass ? '✅' : '❌'} ${t.name}`);
    if (!t.pass) allPass = false;
  });

  // Verify all 8 images exist on server
  const images = [
    '/images/jewelry/cross_chain_main.jpg',
    '/images/jewelry/cross_chain_neck_back.jpg',
    '/images/jewelry/cross_chain_flatlay.jpg',
    '/images/jewelry/cross_chain_blue_shirt.jpg',
    '/images/jewelry/cross_chain_white_collar.jpg',
    '/images/jewelry/cross_chain_plaid_shirt.jpg',
    '/images/jewelry/cross_chain_sunset.jpg',
    '/images/jewelry/cross_chain_double_layer.jpg'
  ];

  console.log('\n--- VERIFYING 8 GALLERY IMAGES STATUS ---');
  for (const img of images) {
    const res = await check('http://localhost:3000' + img);
    console.log(`${res.code === 200 ? '✅' : '❌'} ${img} (HTTP ${res.code})`);
    if (res.code !== 200) allPass = false;
  }

  console.log('\nFinal Verification Result:', allPass ? 'ALL TESTS PASSED 100%!' : 'SOME FAILED');
}

verifyAll();
