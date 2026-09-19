const fs = require('fs');
const html = fs.readFileSync('server/cross_chain_page.html', 'utf8');

// Find media gallery
const regex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
let match;
const list = [];
while ((match = regex.exec(html)) !== null) {
  if (match[1].includes('cdn/shop/files')) {
    list.push({ src: match[1], alt: match[2] });
  }
}

console.log('Gallery images total:', list.length);
list.slice(0, 15).forEach((item, i) => console.log(i + 1, item.src, '|', item.alt));
