const http = require('http');

http.get('http://localhost:3000/product/cross-chain', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const checks = [
      { name: 'Big COD Badge (เก็บเงินปลายทาง)', pass: body.includes('เก็บเงินปลายทาง (COD)') && body.includes('เปิดกล่องเช็กของก่อนจ่ายเงิน') },
      { name: 'Big Free Shipping Badge (ส่งฟรีทั่วไทย)', pass: body.includes('จัดส่งฟรีทั่วไทย') && body.includes('ส่งด่วน Kerry / Flash 1-2 วันถึงหน้าบ้าน') },
      { name: 'Dual Gallery Split Images', pass: body.includes('sava-gallery-duo') && body.includes('cross_chain_main.jpg') && body.includes('cross_chain_neck_back.jpg') },
      { name: '6 Clickable Thumbnails', pass: body.includes('cross_chain_flatlay.jpg') && body.includes('cross_chain_blue_shirt.jpg') && body.includes('cross_chain_white_shirt.jpg') },
      { name: 'Pricing Package 1 (1 เส้น 590 ฿ + ค่าส่ง 50 ฿)', pass: body.includes('590 ฿') && body.includes('790 ฿') && body.includes('50 ฿') },
      { name: 'Pricing Package 2 (2 เส้น คู่ 890 ฿ ส่งฟรี ประหยัด 290 ฿)', pass: body.includes('890 ฿') && body.includes('1,180 ฿') && body.includes('290 ฿') },
      { name: 'Countdown Timer (Same-day dispatch)', pass: body.includes('timerCountdown') && body.includes('same-day dispatch') },
      { name: '1-Click Express COD Checkout Form', pass: body.includes('expressOrderForm') && body.includes('Confirm COD Order') },
      { name: '4 Key Feature Icons (100% Waterproof, Lifetime Warranty, etc.)', pass: body.includes('100% Waterproof') && body.includes('Lifetime Warranty') },
      { name: 'Accordions (Details, Care, Returns)', pass: body.includes('accDetails') && body.includes('accCare') && body.includes('accReturns') }
    ];

    let allOk = true;
    checks.forEach(c => {
      console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
      if (!c.pass) allOk = false;
    });

    console.log('\nResult:', allOk ? 'ALL LANDING PAGE CHECKS PASSED!' : 'SOME CHECKS FAILED');
  });
}).on('error', console.error);
