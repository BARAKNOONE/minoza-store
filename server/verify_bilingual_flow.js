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
  console.log('=== VERIFYING BILINGUAL TH/EN SYSTEM & THAI DEFAULT ===');

  // 1. Check i18n.js
  const i18nRes = await fetchUrl('http://localhost:3000/js/i18n.js');
  console.log('i18n.js Status:', i18nRes.statusCode);

  const i18nChecks = [
    { name: 'i18n.js loads', pass: i18nRes.statusCode === 200 },
    { name: 'Thai is default language', pass: i18nRes.body.includes("currentLang = localStorage.getItem('minozastore_lang') || 'th'") },
    { name: 'Only Thai and English defined', pass: i18nRes.body.includes('th:') && i18nRes.body.includes('en:') && !i18nRes.body.includes('nl:') && !i18nRes.body.includes('eur:') }
  ];

  // 2. Check Home Page (/)
  const homeRes = await fetchUrl('http://localhost:3000/');
  console.log('Home Status:', homeRes.statusCode);

  const homeChecks = [
    { name: 'Header language button is Thai by default', pass: homeRes.body.includes('ภาษาไทย (TH)') },
    { name: 'No NETHERLANDS or EUR in language selector', pass: !homeRes.body.includes('NETHERLANDS (EUR €)') },
    { name: 'Nav in Thai (หน้าแรก, สินค้าขายดี)', pass: homeRes.body.includes('หน้าแรก') && homeRes.body.includes('สินค้าขายดี') },
    { name: 'Hero headline in Thai', pass: homeRes.body.includes('โปรโมชั่น 1 แถม 1 ฟรี') },
    { name: 'Value Props in Thai', pass: homeRes.body.includes('จัดส่งด่วนฟรี') && homeRes.body.includes('รับประกันตลอดชีพ') && homeRes.body.includes('ใส่ได้ทุกวัน') },
    { name: 'Marquee in Thai', pass: homeRes.body.includes('ซื้อ 1 แถม 1 ฟรี (BUY 1 GET 1 FREE)') },
    { name: 'Prices default to Thai Baht (฿)', pass: homeRes.body.includes('8,200 ฿') && homeRes.body.includes('6,990 ฿') && homeRes.body.includes('890 ฿') },
    { name: 'Product names remain in original English', pass: 
        homeRes.body.includes('RIVIERA | SILVER') &&
        homeRes.body.includes('MINOZA ONE WHITE | SILVER') &&
        homeRes.body.includes('CROSS CHAIN | SILVER') &&
        homeRes.body.includes('CROSS BRACELET | SILVER') &&
        homeRes.body.includes('ROPE CHAIN 3MM | SILVER') &&
        homeRes.body.includes('GREEN GEMSTONE CHAIN | 18K GOLD') &&
        homeRes.body.includes('ROPE BRACELET 3MM | SILVER') &&
        homeRes.body.includes('OCEAN CLOVER BRACELET | SILVER')
    }
  ];

  // 3. Check PDP (/product/cross-chain)
  const pdpRes = await fetchUrl('http://localhost:3000/product/cross-chain');
  console.log('PDP Status:', pdpRes.statusCode);

  const pdpChecks = [
    { name: 'PDP includes i18n.js', pass: pdpRes.body.includes('/js/i18n.js') },
    { name: 'PDP header has Thai language button', pass: pdpRes.body.includes('ภาษาไทย (TH)') },
    { name: 'PDP product title in English (CROSS CHAIN | SILVER)', pass: pdpRes.body.includes('CROSS CHAIN | SILVER') },
    { name: 'PDP Fear busters in Thai', pass: pdpRes.body.includes('เก็บเงินปลายทาง (COD)') && pdpRes.body.includes('จัดส่งฟรีทั่วไทย') },
    { name: 'PDP packages in Thai', pass: pdpRes.body.includes('ซื้อ 1 เส้น (ชิ้นเดี่ยว)') && pdpRes.body.includes('2 เส้น (คู่) — ซื้อ 1 แถม 1 ฟรี') },
    { name: 'PDP CTA button is เพิ่มเข้าตะกร้า', pass: pdpRes.body.includes('เพิ่มเข้าตะกร้า — 890 ฿') }
  ];

  const all = [...i18nChecks, ...homeChecks, ...pdpChecks];
  let failed = false;
  all.forEach(c => {
    if (c.pass) {
      console.log(`✅ ${c.name}`);
    } else {
      console.log(`❌ ${c.name}`);
      failed = true;
    }
  });

  if (failed) {
    console.error('\nVerification FAILED!');
    process.exit(1);
  } else {
    console.log('\nAll Bilingual & Thai Default checks PASSED 100%!');
  }
}

verify();
