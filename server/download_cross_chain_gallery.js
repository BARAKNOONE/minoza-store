const fs = require('fs');
const https = require('https');
const path = require('path');

const targetDir = path.join(__dirname, '../public/images/jewelry');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const images = [
  { name: 'cross_chain_main.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/1_56bdfd1f-7ab3-4930-b5bc-8d7f06745748.jpg?v=1751043823&width=1000' },
  { name: 'cross_chain_neck_back.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/Collectie2-Necklaces-JuisteAfmetingen_1_1d958efd-5f02-4894-b2c8-9b686d26a4a4.jpg?v=1756815821&width=1000' },
  { name: 'cross_chain_flatlay.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/forged-cross-chain-silver-2.jpg?v=1787412222&width=1000' },
  { name: 'cross_chain_blue_shirt.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/9_4b318cd7-3d01-49a4-9e14-ed42efcc5d94.jpg?v=1788886952&width=1000' },
  { name: 'cross_chain_white_shirt.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/Collectie3-Bracelets-JuisteAfmetingen_9.jpg?v=1765024423&width=1000' },
  { name: 'cross_chain_grey_shirt.jpg', url: 'https://sava-amsterdam.com/cdn/shop/files/KopievanCollectie2-Necklaces-JuisteAfmetingen_9d9e464c-ab9c-4691-93b7-c953baf0e729.jpg?v=1788889433&width=1000' }
];

function download(item) {
  return new Promise(resolve => {
    const filePath = path.join(targetDir, item.name);
    const file = fs.createWriteStream(filePath);
    https.get(item.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, res => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded:', item.name);
        resolve();
      });
    }).on('error', err => {
      console.error('Error downloading:', item.name, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const item of images) {
    await download(item);
  }
  console.log('Finished downloading gallery images!');
}

run();
