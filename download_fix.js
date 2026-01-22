const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CACHE_DIR = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
const FILE_NAME = 'winCodeSign-2.6.0.7z';
const URL = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
const DEST_PATH = path.join(CACHE_DIR, FILE_NAME);

console.log(`Checking cache dir: ${CACHE_DIR}`);

if (!fs.existsSync(CACHE_DIR)) {
    console.log('Creating cache dir...');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Clean up old stuff
console.log('Cleaning old cache files...');
try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
        if (file !== FILE_NAME) { // Keep if already downloaded successfully
            const p = path.join(CACHE_DIR, file);
            const stat = fs.statSync(p);
            if (stat.isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
            } else {
                fs.unlinkSync(p);
            }
        }
    }
} catch (e) {
    console.error('Error cleaning:', e);
}

console.log(`Downloading ${URL} to ${DEST_PATH}...`);

const file = fs.createWriteStream(DEST_PATH);

https.get(URL, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`Redirecting to ${response.headers.location}...`);
        https.get(response.headers.location, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Download complete!');
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Download complete!');
        });
    }
}).on('error', (err) => {
    fs.unlink(DEST_PATH);
    console.error('Error downloading:', err.message);
});
