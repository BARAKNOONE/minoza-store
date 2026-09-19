const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'sava-amsterdam.com',
  path: '/',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  }
};

https.get(options, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    fs.writeFileSync('server/sava_home.html', d);
    console.log('Saved server/sava_home.html, length:', d.length);

    const matches = d.match(/https?:\/\/[^"'\s<>]+?\.(?:jpg|png|webp)/gi) || [];
    const files = Array.from(new Set(matches)).filter(u => u.includes('files') || u.includes('cdn'));
    console.log('Found assets:', files.length);
    files.forEach(f => console.log(f));
  });
});
