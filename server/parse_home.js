const fs = require('fs');
const html = fs.readFileSync('server/sava_home.html', 'utf8');

const regex = /(?:https:)?\/\/[^"'<>\s]+?\.(?:jpg|png|webp)/gi;
const all = html.match(regex) || [];
const filtered = Array.from(new Set(all)).filter(u => u.includes('files') || u.includes('cdn'));

console.log('Total matches:', filtered.length);
filtered.forEach(u => console.log(u));
