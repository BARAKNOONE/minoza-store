const https = require('https');
const fs = require('fs');
const path = require('path');

const productUrl = 'https://sava-amsterdam.com/products/cross-chain';

https.get(productUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    fs.writeFileSync('server/cross_chain_page.html', html);
    console.log('Saved cross_chain_page.html, size:', html.length);

    // Extract all image URLs
    const regex = /(?:https:)?\/\/[^"'<>\s]+?\.(?:jpg|png|webp)/gi;
    const all = html.match(regex) || [];
    const filtered = Array.from(new Set(all)).filter(u => u.includes('files') || u.includes('cdn'));
    console.log('Found images:', filtered.length);
    filtered.slice(0, 20).forEach(u => console.log(u));
  });
}).on('error', err => console.error(err));
