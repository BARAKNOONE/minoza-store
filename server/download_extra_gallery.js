const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../public/images/jewelry');

const downloads = [
  { name: 'cross_chain_white_collar.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/Collectie3-Bracelets-JuisteAfmetingen_9.jpg?v=1765024423&width=1000' },
  { name: 'cross_chain_plaid_shirt.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/KopievanCollectie2-Necklaces-JuisteAfmetingen_9d9e464c-ab9c-4691-93b7-c953baf0e729.jpg?v=1788889433&width=1000' },
  { name: 'cross_chain_sunset.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/KopievanCollectie2-Necklaces-JuisteAfmetingen_4.jpg?v=1788889445&width=1000' },
  { name: 'cross_chain_double_layer.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/8_f7af7699-c8b7-42bf-8345-a1da0dace7f4.jpg?v=1788889456&width=1000' }
];

function download(item) {
  return new Promise(resolve => {
    const filePath = path.join(targetDir, item.name);
    const file = fs.createWriteStream(filePath);
    https.get(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded:', item.name);
        resolve();
      });
    }).on('error', err => {
      console.error('Error downloading:', item.name, err);
      resolve();
    });
  });
}

async function run() {
  for (const item of downloads) await download(item);
  console.log('All 8 gallery images ready!');
}
run();
