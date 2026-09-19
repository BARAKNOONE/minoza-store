const fs = require('fs');
const path = require('path');
const https = require('https');

const lifestyleDir = path.join(__dirname, '../public/images/lifestyle');
const jewelryDir = path.join(__dirname, '../public/images/jewelry');

if (!fs.existsSync(lifestyleDir)) fs.mkdirSync(lifestyleDir, { recursive: true });
if (!fs.existsSync(jewelryDir)) fs.mkdirSync(jewelryDir, { recursive: true });

const downloads = [
  // Lifestyle
  { url: 'https://sava-amsterdam.com/cdn/shop/files/preview_images/8f11f8d6cb944fbbb208cceab80e6787.thumbnail.0000000000_2160x.jpg', dest: path.join(lifestyleDir, 'hero_yacht_model.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/Ontwerp_zonder_titel_2_167786fc-1d7e-4c1d-b34a-4e91a581fa7c.jpg', dest: path.join(lifestyleDir, 'banner_limited_watch.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/Ontwerp_zonder_titel_3_c1b2ceaf-56a9-4d34-8faf-d7d9ea5442d2.jpg', dest: path.join(lifestyleDir, 'banner_bestsellers_villa.jpg') },
  
  // Value prop icons
  { url: 'https://sava-amsterdam.com/cdn/shop/files/box_34_1000x1000.svg', dest: path.join(lifestyleDir, 'icon_box.svg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/shield_16_1000x1000.svg', dest: path.join(lifestyleDir, 'icon_shield.svg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/buildings_1_1000x1000.svg', dest: path.join(lifestyleDir, 'icon_buildings.svg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/ornament_1_1000x1000.svg', dest: path.join(lifestyleDir, 'icon_ornament.svg') },

  // 8 Best Sellers
  { url: 'https://sava-amsterdam.com/cdn/shop/files/4_049915cb-33ae-45f0-a574-0dfaefff3ed0.jpg', dest: path.join(jewelryDir, 'riviera_silver.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/Collectie2-Necklaces-JuisteAfmetingen_46234fe2-a983-4a87-a2f3-995f706a5aaf.jpg', dest: path.join(jewelryDir, 'minoza_one_white.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/1_56bdfd1f-7ab3-4930-b5bc-8d7f06745748.jpg', dest: path.join(jewelryDir, 'cross_chain_silver.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/Collectie3-Bracelets-JuisteAfmetingen_6.jpg', dest: path.join(jewelryDir, 'cross_bracelet_silver.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/25_1b543e4a-6913-45c3-87ca-db8846f5ed51.jpg', dest: path.join(jewelryDir, 'rope_chain_silver.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/266.jpg', dest: path.join(jewelryDir, 'green_gemstone_gold.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/17_fa43f769-b14e-4449-9744-75aab0a2ecb8.jpg', dest: path.join(jewelryDir, 'rope_bracelet_silver.jpg') },
  { url: 'https://sava-amsterdam.com/cdn/shop/files/ocean-clover-bracelet-silver-1.jpg', dest: path.join(jewelryDir, 'ocean_clover_silver.jpg') }
];

function downloadFile(item) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(item.dest);
    https.get(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('Downloaded (redirect):', path.basename(item.dest));
            resolve();
          });
        });
      } else {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Downloaded:', path.basename(item.dest));
          resolve();
        });
      }
    }).on('error', (err) => {
      console.error('Failed downloading:', item.url, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const item of downloads) {
    await downloadFile(item);
  }
  console.log('All downloads completed!');
}

run();
