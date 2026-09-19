const fs = require('fs');
const html = fs.readFileSync('server/sava_home.html', 'utf8');

const start = html.indexOf('id="collection_8pD7Pd"');
const end = html.indexOf('</swiper-component>', start);
const sub = html.substring(start, end);

const cards = sub.split('<product-card');
console.log('Total cards found:', cards.length - 1);

const products = [];
cards.slice(1).forEach((c, idx) => {
  const titleMatch = c.match(/title="Go to ([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : 'Unknown';
  
  // Find images
  const imgs = Array.from(c.matchAll(/src="([^"]+)"/g)).map(m => m[1]);
  
  // Find badges (NEW, BESTSELLER)
  const badgeMatch = c.match(/badge[^>]*>([^<]+)</i);
  const badge = badgeMatch ? badgeMatch[1].trim() : '';

  // Find reviews / rating
  const ratingMatch = c.match(/aria-label="([^"]+)"/);
  const rating = ratingMatch ? ratingMatch[1] : '';

  // Find price
  const priceMatches = Array.from(c.matchAll(/class="[^"]*price[^"]*"[^>]*>([^<]+)</g)).map(m => m[1].trim());

  console.log({
    idx: idx + 1,
    title,
    badge,
    rating,
    img: imgs[0],
    priceMatches
  });
});
