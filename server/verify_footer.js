const http = require('http');

function get(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ code: res.statusCode, body: b }));
    }).on('error', e => resolve({ code: 500, error: e.message }));
  });
}

async function run() {
  console.log('=== VERIFYING FOOTER & CART DRAWER OFF-CANVAS ===');

  const css = await get('http://localhost:3000/css/style.css');
  console.log('CSS Status:', css.code);
  const cssChecks = [
    { name: 'cart-drawer has fixed & transform translateX(100%)', pass: css.body.includes('.cart-drawer') && css.body.includes('translateX(100%)') && css.body.includes('position: fixed') },
    { name: 'cart-overlay has fixed & opacity 0', pass: css.body.includes('.cart-overlay') && css.body.includes('opacity: 0') },
    { name: 'sava-site-footer styling present', pass: css.body.includes('.sava-site-footer') && css.body.includes('background: #000000') },
    { name: 'sava-footer-grid 4-columns defined', pass: css.body.includes('.sava-footer-grid') && css.body.includes('grid-template-columns') },
    { name: 'sava-footer-links list-style: none defined', pass: css.body.includes('.sava-footer-links') && css.body.includes('list-style: none') }
  ];

  cssChecks.forEach(c => console.log(`${c.pass ? '✅' : '❌'} ${c.name}`));

  const home = await get('http://localhost:3000/');
  console.log('\nHome Status:', home.code);
  console.log(`${home.body.includes('sava-site-footer') ? '✅' : '❌'} Home uses sava-site-footer`);

  const pdp = await get('http://localhost:3000/product/cross-chain');
  console.log('\nPDP Status:', pdp.code);
  console.log(`${pdp.body.includes('sava-site-footer') ? '✅' : '❌'} PDP uses sava-site-footer`);
  console.log(`${pdp.body.includes('sava-footer-links') ? '✅' : '❌'} PDP uses sava-footer-links`);

  console.log('\nVERIFICATION COMPLETE!');
}

run();
