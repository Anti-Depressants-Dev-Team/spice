const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 6969;
const PUBLIC_DIR = path.join(__dirname, 'mini-player');

let server;
let currentState = {
    track: null,
    currentTime: 0,
    paused: true,
    volume: 1.0
};

let controlCallback = null;

function startServer(callback) {
    if (controlCallback) return; // Already running logic check
    controlCallback = callback;

    server = http.createServer((req, res) => {
        // CORs
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // API Endpoints
        if (req.url === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentState));
            return;
        }

        if (req.url === '/api/control' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (controlCallback) controlCallback(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400);
                    res.end('Invalid JSON');
                }
            });
            return;
        }

        // Static Files
        let filePath = req.url === '/' ? '/index.html' : req.url;
        filePath = path.join(PUBLIC_DIR, filePath);

        // Anti-directory traversal
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403);
            res.end();
            return;
        }

        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500);
                    res.end('500 Server Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
                res.end(content);
            }
        });
    });

    server.listen(PORT, () => {
        console.log(`[MiniPlayer] Server running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        console.error('[MiniPlayer] Server error:', err.message);
    });
}

function updateState(newState) {
    currentState = { ...currentState, ...newState };
}

module.exports = { startServer, updateState };
