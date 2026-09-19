const fs = require('fs');
const html = fs.readFileSync('server/cross_chain_page.html', 'utf8');

const regex = /https?:\/\/[^"'\s]+\.(?:jpg|webp)/gi;
const matches = Array.from(new Set(html.match(regex) || []));
console.log('Total matches:', matches.length);
const cdn = matches.filter(u => u.includes('files') && (u.includes('Collectie') || u.includes('56bdfd1f') || u.includes('cross') || u.includes('4b318cd7') || u.includes('7c419738') || u.includes('29df060e') || u.includes('ba6c52b4')));
console.log('Filtered CDN matches:', cdn.length);
cdn.forEach(u => console.log(u));
