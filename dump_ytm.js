const https = require('https');
const fs = require('fs');
https.get('https://music.youtube.com/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => fs.writeFileSync('ytm_dump.html', data));
});
