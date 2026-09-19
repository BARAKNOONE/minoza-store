const fs = require('fs');
const html = fs.readFileSync('server/cross_chain_page.html', 'utf8');

const regex = /\/\/sava-amsterdam\.com\/cdn\/shop\/files\/[^\s"'<>&]+\.(?:jpg|webp|png)/gi;
const set = Array.from(new Set(html.match(regex) || []));
console.log('Matches:', set.length);
set.forEach((u, i) => console.log(i + 1, u));
