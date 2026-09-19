const fs = require('fs');
const html = fs.readFileSync('server/cross_chain_page.html', 'utf8');

// SAVA Amsterdam uses Shopify product.media JSON or thumbnails
const jsonMatch = html.match(/"media":\s*(\[[^\]]+\])/);
if (jsonMatch) {
  console.log('Found media JSON');
}

// Find all unique images under cdn/shop/files that correspond to cross chain
const regex = /\/\/sava-amsterdam\.com\/cdn\/shop\/files\/([^"'\s&]+)/g;
let m;
const set = new Set();
while ((m = regex.exec(html)) !== null) {
  if (m[1].endsWith('.jpg') || m[1].endsWith('.webp') || m[1].endsWith('.png')) {
    set.add('https://sava-amsterdam.com/cdn/shop/files/' + m[1]);
  }
}

const list = Array.from(set);
console.log('Total files found:', list.length);
list.forEach((url, i) => console.log(i + 1, url));
