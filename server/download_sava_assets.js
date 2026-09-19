const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '..', 'public', 'images', 'jewelry');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const imagesToDownload = [
  // Cross Bracelet
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/Collectie3-Bracelets-JuisteAfmetingen_6.jpg?v=1751043710',
    filename: 'cross_bracelet_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/Collectie3-Bracelets-JuisteAfmetingen_1.jpg?v=1751043710',
    filename: 'cross_bracelet_2.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/17_7404c377-3177-46a9-b817-33dfeb21be4e.jpg?v=1765024449',
    filename: 'cross_bracelet_3.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/Collection4-BasxBorashoot_4.jpg?v=1765024449',
    filename: 'cross_bracelet_model.jpg'
  },

  // Crucifix Chain
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/93_eb525dce-9eaf-4912-af1e-b82ff1ce49fa.jpg?v=1759320595',
    filename: 'crucifix_chain_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/434.jpg?v=1783378590',
    filename: 'crucifix_chain_2.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/20_5818f3e4-1e5f-430d-a9e3-2451beff5544.jpg?v=1762879696',
    filename: 'crucifix_chain_model.jpg'
  },

  // Rope Chain 3mm
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/25_1b543e4a-6913-45c3-87ca-db8846f5ed51.jpg?v=1751964370',
    filename: 'rope_chain_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/149_ac176b8f-e055-420a-a397-96b2c50b47d5.jpg?v=1770312473',
    filename: 'rope_chain_model.jpg'
  },

  // Ocean Clover Bracelet
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/ocean-clover-bracelet-silver-1.jpg?v=1787412123',
    filename: 'ocean_clover_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/415.jpg?v=1783077565',
    filename: 'ocean_clover_model.jpg'
  },

  // White Clover Bracelet
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/white-clover-bracelet-silver-1.jpg?v=1787412124',
    filename: 'white_clover_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/462.jpg?v=1783378387',
    filename: 'white_clover_model.jpg'
  },

  // Midnight Clover Bracelet
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/midnight-clover-bracelet-silver-1.jpg?v=1787412121',
    filename: 'midnight_clover_1.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/421.jpg?v=1783077461',
    filename: 'midnight_clover_model.jpg'
  },

  // White Como Ring 18K Gold
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/white-como-ring-gold-1.jpg?v=1787411028',
    filename: 'como_ring_gold_1.jpg'
  },

  // Riviera Watch
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/4_049915cb-33ae-45f0-a574-0dfaefff3ed0.jpg?v=1778351111',
    filename: 'riviera_watch_silver.jpg'
  },
  {
    url: 'https://cdn.shopify.com/s/files/1/0819/7174/1006/files/20_3900f527-3b53-4ffa-b7f2-b2f95d8550f3.jpg?v=1778350754',
    filename: 'riviera_watch_twotone.jpg'
  }
];

function downloadFile(item) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(targetDir, item.filename);
    const file = fs.createWriteStream(filePath);
    https.get(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${item.url}: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${item.filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading SAVA jewelry assets...');
  for (const item of imagesToDownload) {
    try {
      await downloadFile(item);
    } catch (e) {
      console.warn(`Error downloading ${item.filename}:`, e.message);
    }
  }
  console.log('All jewelry images downloaded successfully!');
}

main();
