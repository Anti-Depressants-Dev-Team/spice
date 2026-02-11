const { app, BrowserWindow, BrowserView, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Simple File Logger for Production Debugging - INITIALIZE FIRST
const logFile = path.join(app.getPath('userData'), 'debug.log');
function logToFile(msg) {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    } catch (e) { }
}

// Override console methods to log to file in production
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => {
    originalConsoleLog(...args);
    try { logToFile(`INFO: ${args.join(' ')}`); } catch (e) { }
};
console.error = (...args) => {
    originalConsoleError(...args);
    try { logToFile(`ERROR: ${args.join(' ')}`); } catch (e) { }
};

// Handle uncaught exceptions immediately
process.on('uncaughtException', (error) => {
    logToFile(`CRITICAL ERROR: ${error.stack}`);
    try {
        dialog.showErrorBox('Critical Error', `A critical error occurred:\n${error.message}\nCheck debug.log for details.`);
    } catch (e) { }
});

console.log('App Starting...');

let ElectronBlocker, fetch, Scrobbler, validateListenBrainzToken, discordRpc;

try {
    console.log('Loading dependencies...');
    ({ ElectronBlocker } = require('@cliqz/adblocker-electron'));
    fetch = require('node-fetch');
    ({ Scrobbler, validateListenBrainzToken } = require('./scrobbler'));
    discordRpc = require('./discord-rpc');
    console.log('Dependencies loaded successfully.');
} catch (err) {
    console.error('FAILED TO LOAD DEPENDENCIES:', err);
}

let store;
let mainWindow;
let view;
let adBlocker = null;
let scrobbler = null;
let currentService = null; // Track which service is active for Discord RPC
let lastTrack = null; // Store last track to send to lyrics on open
let lyricsWindow = null;
let currentVolume = 1.0; // Volume gain value (0.0 - 10.0), shared across scopes

const SERVICES = {
    yt: 'https://music.youtube.com',
    sc: 'https://soundcloud.com'
};

const AD_CSS = `
    .video-ads, .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay,
    ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-compact-promoted-item-renderer,
    .ytd-action-companion-ad-renderer, .ytd-search-pyv-renderer,
    #player-ads, .ad-container, .masthead-ad-control {
        display: none !important;
    }
`;

function initStore() { // Synchronous init with CJS electron-store
    try {
        const Store = require('electron-store');
        store = new Store();
        // Initialize scrobbler after store
        scrobbler = new Scrobbler(store);
        console.log('Scrobbler initialized');
    } catch (error) {
        console.error('Failed to initialize electron-store:', error);
    }
}



function createWindow() {
    const lastService = store ? store.get('lastService') : null;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#121212', // Match CSS bg
        icon: path.join(__dirname, 'icon.png'), // App icon for taskbar/desktop
        frame: false, // Frameless window
        titleBarStyle: 'hidden', // Hide default title bar, but keep traffic lights on macOS (we'll implement custom anyway)
        titleBarOverlay: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        show: false
    });

    // Remove default menu
    mainWindow.setMenuBarVisibility(false);

    // Block default DevTools shortcuts (F12, Ctrl+Shift+I)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            event.preventDefault();
            console.log('Blocked DevTools shortcut');
        }
    });

    // Initial load
    mainWindow.loadFile(path.join(__dirname, 'index.html')).then(() => {
        mainWindow.show();

        // Check for Default Service Startup
        const startupService = store ? store.get('defaultService', 'yt') : 'yt'; // Default to YT Music

        if (startupService && SERVICES[startupService]) {
            console.log(`Auto-loading Default Service: ${startupService}`);
            loadService(startupService);
        } else {
            // If 'home' or invalid, stay on home (index.html)
            console.log('Staying on Home Screen');
        }
    });

    mainWindow.on('resize', () => {
        if (view) {
            updateViewBounds();
        }
    });

    // Handle Main Window Close - Ensure App Quits
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (lyricsWindow) {
            lyricsWindow.close();
        }
        if (miniPlayerWindow) {
            miniPlayerWindow.close();
        }
        // Properly disconnect Discord RPC before quitting
        if (discordRpc) {
            discordRpc.disconnect();
        }
        // Force quit to ensure no background processes remain
        app.quit();
    });
}

// Mini Player Logic
let miniPlayerWindow = null;
const miniPlayerServer = require('./src/server');

function createMiniPlayerWindow() {
    if (miniPlayerWindow) {
        miniPlayerWindow.focus();
        return;
    }

    miniPlayerWindow = new BrowserWindow({
        width: 400,
        height: 200,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        backgroundColor: '#121212',
        title: 'Spice Mini Player',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    miniPlayerWindow.setMenuBarVisibility(false);
    miniPlayerWindow.loadURL('http://localhost:6969'); // Load from local server

    miniPlayerWindow.on('closed', () => {
        miniPlayerWindow = null;
    });
}

// Initialize Server
app.whenReady().then(() => {
    miniPlayerServer.startServer((action) => {
        console.log('[MiniPlayer] Action received:', action);

        if (action.action === 'close') {
            if (miniPlayerWindow) {
                miniPlayerWindow.close();
            }
            return;
        }

        if (!view) return;

        // Execute actions on the main player view
        const code = `
            (function() {
                const click = (sel) => document.querySelector(sel)?.click();
                
                if ('${action.action}' === 'playpause') {
                   // Generic toggle or service specific
                   const ytm = document.querySelector('#play-pause-button');
                   if (ytm) ytm.click();
                   else click('.playControl');
                }
                else if ('${action.action}' === 'next') {
                    const ytm = document.querySelector('.next-button');
                    if (ytm) ytm.click();
                    else click('.skipControl__next');
                }
                else if ('${action.action}' === 'prev') {
                    const ytm = document.querySelector('.previous-button');
                    if (ytm) ytm.click();
                    else click('.skipControl__previous');
                }
                else if ('${action.action}' === 'volume') {
                    // Handled in main process below
                }
                else if ('${action.action}' === 'shuffle') {
                    console.log('[MiniPlayer] Shuffle requested');
                    
                    const findBtn = (selectors) => {
                        for (const s of selectors) {
                            const el = document.querySelector(s);
                            if (el) return el;
                        }
                        return null;
                    };

                    // YTM Selectors (various states)
                    const ytmShuffle = findBtn([
                        '.shuffle-button',
                        'tp-yt-paper-icon-button[aria-label="Shuffle"]',
                        'tp-yt-paper-icon-button[aria-label="Shuffle on"]',
                        'tp-yt-paper-icon-button[aria-label="Shuffle off"]',
                        'ytmusic-player-bar .shuffle',
                        '[class*="shuffle"]'
                    ]);

                    if (ytmShuffle) {
                        console.log('[MiniPlayer] YTM Shuffle found:', ytmShuffle);
                        ytmShuffle.click();
                    } else {
                         console.log('[MiniPlayer] YTM Shuffle NOT found');
                    }
                    
                    // SoundCloud
                    const scShuffle = document.querySelector('.shuffleControl');
                    if (scShuffle) scShuffle.click();
                }
                else if ('${action.action}' === 'repeat') {
                    console.log('[MiniPlayer] Repeat requested');
                    
                    const findBtn = (selectors) => {
                        for (const s of selectors) {
                            const el = document.querySelector(s);
                            if (el) return el;
                        }
                        return null;
                    };

                    // YTM Selectors (various states)
                    const ytmRepeat = findBtn([
                        '.repeat-button',
                        'tp-yt-paper-icon-button[aria-label="Repeat"]',
                        'tp-yt-paper-icon-button[aria-label="Repeat all"]',
                        'tp-yt-paper-icon-button[aria-label="Repeat one"]',
                        'tp-yt-paper-icon-button[aria-label="Repeat off"]',
                        'ytmusic-player-bar .repeat',
                        '[class*="repeat"]'
                    ]);

                    if (ytmRepeat) {
                        console.log('[MiniPlayer] YTM Repeat found:', ytmRepeat);
                        ytmRepeat.click();
                    } else {
                         console.log('[MiniPlayer] YTM Repeat NOT found');
                    }
                    
                    // SoundCloud
                    const scRepeat = document.querySelector('.repeatControl');
                    if (scRepeat) scRepeat.click();
                }
            })();
        `;
        view.webContents.executeJavaScript(code).catch(e => console.error(e));

        // Handle volume separately in main process (uses AudioContext gain, not video.volume)
        if (action.action === 'volume' && action.value !== undefined) {
            // Emit internally — picked up by ipcMain.on('set-volume') which calls applyVolume
            ipcMain.emit('set-volume', { sender: mainWindow?.webContents }, action.value);
            // Immediately update mini player server state so slider doesn't reset on next poll
            miniPlayerServer.updateState({ volume: action.value });
            // Sync the main app's volume slider
            if (mainWindow) mainWindow.webContents.send('volume-changed', action.value);
        }
    });
});

function updateViewBounds() {
    if (!view || !mainWindow) return;
    const bounds = mainWindow.getBounds();
    // Title bar: 40px. No Top Nav. Total 40px offset.
    view.setBounds({ x: 0, y: 40, width: bounds.width, height: bounds.height - 40 });
}

const AD_SKIP_SCRIPT = `
        (function () {
            console.log('[Spice AdBlocker] Script injected');

            setInterval(() => {
                // Skip video ads by clicking skip button
                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
                if (skipBtn) {
                    skipBtn.click();
                    console.log('[Spice AdBlocker] Clicked skip button');
                }

                // Fast-forward ads that can't be skipped
                const adContainer = document.querySelector('.ad-showing');
                const video = document.querySelector('video');
                if (adContainer && video && video.duration && !isNaN(video.duration)) {
                    video.currentTime = video.duration;
                    console.log('[Spice AdBlocker] Fast-forwarded ad');
                }

                // Close overlay ads
                const closeBtn = document.querySelector('.ytp-ad-overlay-close-button');
                if (closeBtn) {
                    closeBtn.click();
                    console.log('[Spice AdBlocker] Closed overlay ad');
                }

                // Mute ads (backup if they still play)
                const adPlaying = document.querySelector('.ad-interrupting');
                if (adPlaying && video) {
                    video.muted = true;
                }
            }, 300);
        })();
    `;

function injectAdSkipper(targetView) {
    if (!targetView) return;
    targetView.webContents.executeJavaScript(AD_SKIP_SCRIPT).catch(err => {
        console.error('[AdBlocker] Failed to inject script:', err);
    });
}

function loadService(serviceKey) {
    if (!SERVICES[serviceKey]) return;

    // Track current service for Discord RPC
    currentService = serviceKey;

    // Save state - DISABLE for now to favor explicit Default Setting
    // if (store) store.set('lastService', serviceKey);

    // Create or update BrowserView
    if (!view) {
        console.log('Creating new BrowserView...');
        view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: false, // Disabled so preload can receive window messages
                partition: 'persist:main', // Use a named partition
                preload: path.join(__dirname, 'preload-view.js')
            }
        });
        mainWindow.setBrowserView(view);
        console.log('BrowserView set to mainWindow');
    } else {
        // Ensure view is attached and correct bounds
        mainWindow.setBrowserView(view);
        console.log('Reuse logic invoked (should be unreachable if view is destroyed)');
    }

    updateViewBounds();

    // Notify renderer that a service is active (to show top bar)
    mainWindow.webContents.send('service-active', true);

    console.log(`Loading service URL: ${SERVICES[serviceKey]} `);
    view.webContents.loadURL(SERVICES[serviceKey]).then(() => {
        console.log(`Successfully loaded ${serviceKey} `);

        // Open DevTools for debugging (User Request) - REMOVED for "Settings Only" restriction
        // view.webContents.openDevTools({ mode: 'detach' });

        // Inject CSS for Cosmetic Blocking
        view.webContents.insertCSS(AD_CSS);

        // Inject Ad-Skip Script
        injectAdSkipper(view);

        // Inject Track Detection Script based on service
        injectTrackDetection(serviceKey);

        // Start main process polling (bypasses broken preload IPC)
        startTrackPolling();
    }).catch(e => {
        console.error(`Failed to load ${serviceKey}: `, e);
    });

}

function goHome() {
    console.log('goHome() called');
    stopTrackPolling(); // Stop polling when navigating away
    if (view) {
        mainWindow.setBrowserView(null);
        view.webContents.destroy();
        view = null;
        console.log('BrowserView destroyed');
    }
    if (store) store.delete('lastService');
    currentService = null;
    // Clear Discord RPC
    discordRpc.clearPresence();
    mainWindow.webContents.send('service-active', false);
}

// ============== MAIN PROCESS TRACK POLLING ==============
// This bypasses the broken preload IPC by polling directly from main
let trackPollingInterval = null;
let lastPolledTrackKey = null;
let lastPolledTime = 0;

function startTrackPolling() {
    if (trackPollingInterval) {
        clearInterval(trackPollingInterval);
    }

    console.log('[Main] Starting track polling...');

    trackPollingInterval = setInterval(async () => {
        if (!view || !view.webContents) {
            console.log('[Main Poll] No view available');
            return;
        }

        try {
            console.log('[Main Poll] Executing JavaScript for track info...');
            // Query track info directly from the page - simplified to return raw text
            const rawData = await view.webContents.executeJavaScript(`
                (function() {
                    const playerBar = document.querySelector('ytmusic-player-bar');
                    const video = document.querySelector('video');
                    const albumArtEl = document.querySelector('ytmusic-player-bar .image img, .thumbnail-image-wrapper img');
                    
                    // Get shuffle/repeat state from the DOM
                    let shuffle = false;
                    let repeat = 'off';
                    const shuffleBtn = document.querySelector('.shuffle.ytmusic-player-bar, tp-yt-paper-icon-button.shuffle');
                    if (shuffleBtn) {
                        const ariaLabel = (shuffleBtn.getAttribute('aria-label') || '').toLowerCase();
                        const title = (shuffleBtn.getAttribute('title') || '').toLowerCase();
                        // "Shuffle off" means shuffle is currently ON (clicking turns it off)
                        shuffle = ariaLabel.includes('shuffle off') || title.includes('shuffle off') || shuffleBtn.getAttribute('aria-pressed') === 'true';
                    }
                    const repeatBtn = document.querySelector('.repeat.ytmusic-player-bar, tp-yt-paper-icon-button.repeat');
                    if (repeatBtn) {
                        const ariaLabel = (repeatBtn.getAttribute('aria-label') || '').toLowerCase();
                        const title = (repeatBtn.getAttribute('title') || '').toLowerCase();
                        if (ariaLabel.includes('repeat one') || title.includes('repeat one')) repeat = 'one';
                        else if (ariaLabel.includes('repeat all') || title.includes('repeat all') || ariaLabel.includes('repeat off') || title.includes('repeat off')) repeat = 'all';
                    }
                    
                    if (!playerBar || !video) return { videoOnly: true, paused: video ? video.paused : true, shuffle: shuffle, repeat: repeat };
                    
                    // Get all the text from player bar
                    const rawText = playerBar.innerText;
                    
                    // Try to get title directly
                    let titleEl = document.querySelector('ytmusic-player-bar .title');
                    let title = titleEl ? titleEl.textContent.trim() : '';
                    
                    return {
                        rawText: rawText,
                        title: title,
                        albumArt: albumArtEl ? albumArtEl.src : '',
                        duration: video.duration || 0,
                        paused: video.paused,
                        currentTime: video.currentTime,
                        shuffle: shuffle,
                        repeat: repeat
                    };
                })();
            `);

            // Parse the raw data in main process
            let track = null;
            if (rawData && rawData.rawText) {
                const lines = rawData.rawText.split('\n');
                let title = rawData.title || (lines.length > 1 ? lines[1].trim() : '');
                let artist = '';

                // Debug: log raw lines
                console.log('[Main Poll] Raw lines:', lines.slice(0, 3).map(l => l.substring(0, 50)));

                // Third line has "Artist • Album • Year" (line 0 = time, line 1 = title, line 2 = artist)
                if (lines.length >= 3) {
                    artist = lines[2].trim();
                    // Split on bullet character (• or similar)
                    const bulletIndex = artist.indexOf('•');
                    if (bulletIndex > 0) {
                        artist = artist.substring(0, bulletIndex).trim();
                    }
                    // Remove duplicate artist names (e.g., "Clams CasinoClams Casino" -> "Clams Casino")
                    if (artist.length > 4) {
                        const halfLen = Math.floor(artist.length / 2);
                        const firstHalf = artist.substring(0, halfLen);
                        const secondHalf = artist.substring(halfLen);
                        if (firstHalf === secondHalf) {
                            artist = firstHalf;
                        }
                    }
                }

                if (title && artist) {
                    track = {
                        track: title,
                        title: title,
                        artist: artist,
                        album: '',
                        duration: rawData.duration || 0,
                        albumArt: rawData.albumArt || '',
                        paused: rawData.paused,
                        currentTime: rawData.currentTime
                    };
                }
            }

            console.log('[Main Poll] Result:', track ? `${track.title} by ${track.artist}` : 'null');

            if (track && track.title && track.artist) {
                const trackKey = track.artist + ' - ' + track.title;
                const currentTime = track.currentTime || 0;

                // Always update lastTrack for progress tracking
                lastTrack = track;

                // Detect repeat: same track but time jumped back significantly
                let isRepeat = false;
                if (trackKey === lastPolledTrackKey && lastPolledTime > 10 && currentTime < 5) {
                    isRepeat = true;
                    track.isRepeat = true;
                    console.log('[Main Poll] REPEAT DETECTED! Time jumped from', lastPolledTime.toFixed(1), 'to', currentTime.toFixed(1));
                }

                // Update lastPolledTime
                lastPolledTime = currentTime;

                // Update components on track change OR repeat
                if (trackKey !== lastPolledTrackKey || isRepeat) {
                    lastPolledTrackKey = trackKey;
                    console.log('[Main] TRACK POLLED:', track.title, 'by', track.artist, isRepeat ? '(REPEAT)' : '');

                    // Enhance album art
                    if (track.albumArt && track.albumArt.includes('ggpht.com')) {
                        track.albumArt = track.albumArt.replace(/w\d+-h\d+/, 'w1200-h1200');
                        track.artwork = track.albumArt;
                        lastTrack.artwork = track.albumArt;
                    }

                    // Update Scrobbler
                    console.log('[Main Poll] Updating scrobbler...');
                    if (scrobbler) {
                        scrobbler.updateNowPlaying(track);
                    }

                    // Update Lyrics Window
                    console.log('[Main Poll] Updating Lyrics Window...');
                    if (lyricsWindow) {
                        lyricsWindow.webContents.send('lyrics-track-update', track);
                    }
                }

                // ALWAYS update Mini Player and Discord (for progress/time sync)
                // Update Mini Player
                miniPlayerServer.updateState({
                    track: {
                        title: track.title,
                        artist: track.artist,
                        art: track.albumArt || track.artwork,
                        duration: track.duration
                    },
                    paused: track.paused,
                    currentTime: track.currentTime,
                    volume: currentVolume,
                    shuffle: rawData.shuffle || false,
                    repeat: rawData.repeat || 'off'
                });

                // Update Discord RPC with current progress
                const discordEnabled = store ? store.get('discordRpcEnabled', true) : true;
                if (discordEnabled) {
                    discordRpc.updatePresence({
                        ...track,
                        service: currentService,
                        currentTime: track.currentTime,
                        duration: track.duration
                    });
                }

                // Update Lyrics progress for synced lyrics
                if (lyricsWindow) {
                    lyricsWindow.webContents.send('lyrics-progress-update', {
                        currentTime: track.currentTime,
                        duration: track.duration,
                        paused: track.paused
                    });
                }

                // Update scrobbler progress for threshold-based scrobbling
                if (scrobbler && !track.paused) {
                    scrobbler.updateProgress(track.currentTime, track.duration);
                }
            }

            // ALWAYS send basic playback state to mini player, even when track is null
            // This ensures play/pause, shuffle, repeat, and volume stay in sync
            if (!track && rawData) {
                miniPlayerServer.updateState({
                    paused: rawData.paused,
                    volume: currentVolume,
                    shuffle: rawData.shuffle || false,
                    repeat: rawData.repeat || 'off'
                });
            }
        } catch (e) {
            console.log('[Main Poll] Error:', e.message);
        }
    }, 750); // Poll every 750ms for better lyrics sync
}

function stopTrackPolling() {
    if (trackPollingInterval) {
        clearInterval(trackPollingInterval);
        trackPollingInterval = null;
    }
    lastPolledTrackKey = null;
}
// ============== END TRACK POLLING ==============


// Track Detection Script Injection
function injectTrackDetection(serviceKey) {
    console.log(`[Main] injectTrackDetection called for: ${serviceKey}`);
    if (!view) {
        console.log('[Main] injectTrackDetection ABORTED: No view');
        return;
    }

    let script = '';

    if (serviceKey === 'yt') {
        // YouTube Music track detection
        script = `
        (function() {
            console.log('[Spice Scrobbler] YouTube Music track detection injected');
            console.log('[Spice Scrobbler] Checking for spiceReportTrack:', typeof window.spiceReportTrack);
            
            let lastTrackKey = null;
            let lastTime = 0;
            
            function getTrackInfo() {
                // Title selectors - try multiple options
                let titleEl = document.querySelector('ytmusic-player-bar .title.ytmusic-player-bar');
                if (!titleEl) titleEl = document.querySelector('.content-info-wrapper .title');
                if (!titleEl) titleEl = document.querySelector('ytmusic-player-bar .title');
                if (!titleEl) titleEl = document.querySelector('.ytmusic-player-bar-title');
                
                // Artist selectors - YT Music changed their DOM structure
                let artistEl = null;
                // Try byline link first (traditional approach)
                artistEl = document.querySelector('ytmusic-player-bar .byline a');
                if (!artistEl) artistEl = document.querySelector('.content-info-wrapper .byline a');
                // Try complex title (newer structure has yt-formatted-string)
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline yt-formatted-string a');
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline .yt-formatted-string a');
                // Fallback: Get entire byline text (may include extra info but better than nothing)
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline yt-formatted-string');
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline .yt-formatted-string');
                // Ultimate fallback: Any span/text in subtitle or byline
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .subtitle span');
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline span');
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .byline');
                if (!artistEl) artistEl = document.querySelector('ytmusic-player-bar .subtitle');
                
                // Debug what we found
                if (!artistEl) {
                    const playerBar = document.querySelector('ytmusic-player-bar');
                    if (playerBar && (!window._lastDump || Date.now() - window._lastDump > 5000)) {
                        window._lastDump = Date.now();
                        const rawText = playerBar.innerText;
                        console.log('[Spice Scrobbler] Player Bar Text:', rawText.substring(0, 200));
                        // Split on actual newline character
                        const lines = rawText.split(String.fromCharCode(10));
                        console.log('[Spice Scrobbler] Lines count:', lines.length);
                        if (lines.length >= 2) {
                            let artistLine = lines[1]; // Second line usually has artist
                            if (artistLine && artistLine.includes(' \\u2022 ')) {
                                artistLine = artistLine.split(' \\u2022 ')[0];
                            }
                            if (artistLine && artistLine.trim()) {
                                console.log('[Spice Scrobbler] Extracted artist:', artistLine.trim());
                                artistEl = { textContent: artistLine.trim() };
                            }
                        }
                    }
                }
                
                const albumEl = document.querySelector('ytmusic-player-bar .subtitle .yt-formatted-string[href*="browse"]');
                const video = document.querySelector('video');
                
                if (!titleEl || !artistEl) {
                    // Only log once every 10 seconds to reduce spam
                    if (!window._lastSelectorLog || Date.now() - window._lastSelectorLog > 10000) {
                        console.log('[Spice Scrobbler] Waiting for player... Title:', !!titleEl, 'Artist:', !!artistEl);
                        window._lastSelectorLog = Date.now();
                    }
                    return null;
                }
                
                // Get album art
                const albumArtEl = document.querySelector('ytmusic-player-bar .image img, .thumbnail-image-wrapper img, img.ytmusic-player-bar');
                let albumArt = albumArtEl?.src || '';
                if (albumArt) {
                    albumArt = albumArt.replace(/w\\d+-h\\d+/, 'w1200-h1200').replace(/=w\\d+-h\\d+/, '=w1200-h1200').replace(/s\\d+-/, 's1200-');
                }
                
                const title = titleEl.textContent?.trim();
                let artist = artistEl.textContent?.trim();
                
                // Clean artist if it contains extra info (like " • Album Name • 2024")
                if (artist && artist.includes(' • ')) {
                    artist = artist.split(' • ')[0].trim();
                }
                
                const album = albumEl?.textContent?.trim() || '';
                const duration = video?.duration || 0;
                
                if (!title || !artist) return null;
                
                console.log('[Spice Scrobbler] Track detected: ' + title + ' by ' + artist);
                return { track: title, artist, album, duration, albumArt };
            }
            
            function checkForTrackChange() {
                const video = document.querySelector('video');
                if (!video) return;
                // Note: We check even if paused to detect track changes while paused? Usually not needed but good for seeking.
                
                const track = getTrackInfo();
                if (!track) return;
                
                const trackKey = track.artist + ' - ' + track.track;
                const currentTime = video.currentTime;
                const duration = video.duration || 180;

                if (lastTrackKey === trackKey) {
                    // If time jumped back by more than 5 seconds, consider it a seek-to-start or loop
                    // This handles both automatic loops and manual restarts
                    if (currentTime < lastTime && (lastTime - currentTime) > 5) {
                            console.log('[Spice Scrobbler] Repeat detected! (Time jump: ' + lastTime.toFixed(1) + ' -> ' + currentTime.toFixed(1) + ')');
                            track.isRepeat = true;
                            window.spiceReportTrack(track); // Report as repeat
                            lastTime = currentTime;
                            return;
                    }
                }

                if (lastTrackKey !== trackKey) {
                    lastTrackKey = trackKey;
                    console.log('[Spice Scrobbler] Now Playing:', trackKey);
                    console.log('[Spice Scrobbler] spiceReportTrack available:', typeof window.spiceReportTrack);
                    
                    // Send to main process
                    if (typeof window.spiceReportTrack === 'function') {
                        console.log('[Spice Scrobbler] Calling spiceReportTrack...');
                        window.spiceReportTrack(track);
                        console.log('[Spice Scrobbler] spiceReportTrack called successfully');
                    } else {
                        console.log('[Spice Scrobbler] ERROR: spiceReportTrack is NOT a function!');
                    }
                }
                
                lastTime = currentTime;
            }
            
            // Check every 1 second
            setInterval(checkForTrackChange, 1000);
            
            function getControlsState() {
                return { shuffle: false, repeat: 'off' };
            }

            // Report progress/pause state every 500ms
            setInterval(() => {
                const video = document.querySelector('video');
                if (video) {
                    const controls = getControlsState();
                    const progress = {
                            currentTime: video.currentTime,
                            duration: video.duration || 0,
                            paused: video.paused,
                            shuffle: controls.shuffle,
                            repeat: controls.repeat
                    };
                    if (typeof window.spiceReportProgress === 'function') {
                        window.spiceReportProgress(progress);
                    }
                }
            }, 500);

            // Also check on video play events to catch immediate changes
            document.addEventListener('play', (e) => {
                if (e.target.tagName === 'VIDEO') {
                    setTimeout(checkForTrackChange, 200);
                }
            }, true);
        }) ();
    `;
    } else if (serviceKey === 'sc') {
        // SoundCloud track detection
        script = `
        (function () {
            console.log('[Spice Scrobbler] SoundCloud track detection injected');

            let lastTrackKey = null;
            let lastTime = 0;

            function parseTime(timeStr) {
                if (!timeStr) return 0;
                const parts = timeStr.split(':');
                if (parts.length === 2) {
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } else if (parts.length === 3) {
                    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                }
                return 0;
            }

            function getTrackInfo() {
                const titleEl = document.querySelector('.playbackSoundBadge__titleLink span:last-child');
                const artistEl = document.querySelector('.playbackSoundBadge__lightLink');

                if (!titleEl || !artistEl) return null;

                const title = titleEl.textContent?.trim();
                const artist = artistEl.textContent?.trim();

                if (!title || !artist) return null;

                // Get album art
                const albumArtEl = document.querySelector('.playbackSoundBadge__avatar .image span');
                let albumArt = '';
                if (albumArtEl) {
                    const bgImage = getComputedStyle(albumArtEl).backgroundImage;
                    const match = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
                    if (match) {
                        albumArt = match[1].replace(/-t\d+x\d+/, '-t500x500');
                    }
                }

                // Parse duration from UI
                const progressEl = document.querySelector('.playbackTimeline__duration span[aria-hidden="true"]');
                const duration = progressEl ? parseTime(progressEl.textContent) : 0;

                return { track: title, artist, album: '', duration, albumArt };
            }

            function getPlaybackState() {
                // Try to find audio element first
                const audio = document.querySelector('media') || document.querySelector('audio');
                if (audio) {
                    return {
                        currentTime: audio.currentTime,
                        duration: audio.duration,
                        paused: audio.paused
                    };
                }

                // Fallback to UI scraping
                const timePassedEl = document.querySelector('.playbackTimeline__timePassed span[aria-hidden="true"]');
                const currentTime = timePassedEl ? parseTime(timePassedEl.textContent) : 0;

                const playBtn = document.querySelector('.playControl');
                const paused = !playBtn || !playBtn.classList.contains('playing');

                return { currentTime, paused };
            }

            function checkForTrackChange() {
                const state = getPlaybackState();
                // If UI based, only proceed if not paused? No, we want to update state even if paused but only if track exists.

                const track = getTrackInfo();
                if (!track) return;

                const trackKey = track.artist + ' - ' + track.track;
                const currentTime = state.currentTime;
                const duration = track.duration || 180;

                // Repeat Detection
                if (lastTrackKey === trackKey) {
                    // Relaxed logic: Any significant backward jump
                    if (currentTime < lastTime && (lastTime - currentTime) > 5) {
                        console.log(\`[Spice Scrobbler] Repeat detected(SC)! (Time jump: \${lastTime.toFixed(1)} -> \${currentTime.toFixed(1)})\`);
                            track.isRepeat = true;
                            window.spiceReportTrack(track);
                            lastTime = currentTime;
                            lastTime = currentTime;
                            return;
                    }
                } else if (lastTrackKey !== trackKey) {
                    lastTrackKey = trackKey;
                    console.log('[Spice Scrobbler] Now Playing:', trackKey);
                    
                    if (typeof window.spiceReportTrack === 'function') {
                        window.spiceReportTrack(track);
                    }
                }
                lastTime = currentTime;
            }
            
            // Check every 1 second
            setInterval(checkForTrackChange, 1000);

            // Report progress
            setInterval(() => {
                const state = getPlaybackState();
                const track = getTrackInfo(); // Need duration if audio el missing
                
                const progress = {
                        currentTime: state.currentTime,
                        duration: state.duration || track?.duration || 0,
                        paused: state.paused
                };
                
                if (typeof window.spiceReportProgress === 'function') {
                    window.spiceReportProgress(progress);
                }
            }, 500);
        })();
    `;
    }

    if (script) {
        view.webContents.executeJavaScript(script).catch(err => {
            console.error('[Scrobbler] Failed to inject track detection:', err);
        });
    }
}



app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


app.whenReady().then(async () => {
    initStore();

    // NUCLEAR OPTION: Clear Cache on Startup
    if (session.defaultSession) {
        try {
            await session.defaultSession.clearCache();
            console.log('Session cache CLEARED (Nuclear Option)');
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }

    // Determine AdBlocker Type
    // Migration: If adBlockerType is missing, use adBlockerEnabled (bool) -> 'spice' or 'none'
    let adBlockerType = store ? store.get('adBlockerType') : undefined;
    if (!adBlockerType) {
        const enabled = store ? store.get('adBlockerEnabled', true) : true;
        adBlockerType = enabled ? 'spice' : 'none';
        // Persist migration
        if (store) store.set('adBlockerType', adBlockerType);
    }

    console.log(`AdBlocker System: Mode is[${adBlockerType}]`);

    // 1. Spice (Internal Cliqz AdBlocker)
    if (adBlockerType === 'spice') {
        try {
            console.log('Initializing Spice AdBlocker (Strict Mode + uBlock Lists)...');

            const enginePath = path.join(app.getPath('userData'), 'adblock-engine.bin');

            if (fs.existsSync(enginePath)) {
                console.log('Loading AdBlocker engine from cache...');
                try {
                    const buffer = fs.readFileSync(enginePath);
                    adBlocker = ElectronBlocker.deserialize(buffer);
                    console.log('AdBlocker loaded from cache.');
                } catch (e) {
                    console.error('Failed to load cached engine, falling back to network fetch:', e);
                }
            }

            if (!adBlocker) {
                console.log('Fetching comprehensive blocklists (This may take a few seconds)...');
                // uBlock Origin, EasyList, EasyPrivacy, AdGuard
                const lists = [
                    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
                    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
                    'https://easylist.to/easylist/easylist.txt',
                    'https://easylist.to/easylist/easyprivacy.txt',
                    'https://filters.adtidy.org/extension/ublock/filters/2.txt' // AdGuard Base
                ];

                const fetchPromises = lists.map(url => fetch(url).then(r => r.text()));
                const listContents = await Promise.all(fetchPromises);

                console.log('Parsing blocklists...');
                adBlocker = ElectronBlocker.parse(listContents.join('\n'));

                // Save to cache
                console.log('Saving AdBlocker engine to cache...');
                const buffer = adBlocker.serialize();
                fs.writeFileSync(enginePath, buffer);
                console.log('AdBlocker engine saved.');
            }

            if (session.defaultSession) {
                adBlocker.enableBlockingInSession(session.defaultSession);
                console.log('AdBlocker initialized and blocking enabled in default session.');
            }
        } catch (err) {
            console.error('Failed to initialize AdBlocker:', err);
        }
    }
    // 2. uBlock Origin (Extension)
    else if (adBlockerType === 'ublock') {
        try {
            const extPath = path.join(__dirname, 'src', 'extensions', 'ublock0', 'uBlock0.chromium');
            console.log(`Loading uBlock Origin from: ${extPath} `);
            await session.defaultSession.loadExtension(extPath);
            console.log('uBlock Origin loaded successfully.');
        } catch (e) {
            console.error('Failed to load uBlock Origin extension:', e);
        }
    }
    // 3. uBlock Origin Lite (Extension)
    else if (adBlockerType === 'ublock_lite') {
        try {
            const extPath = path.join(__dirname, 'src', 'extensions', 'ubolite');
            console.log(`Loading uBlock Origin Lite from: ${extPath} `);
            await session.defaultSession.loadExtension(extPath);
            console.log('uBlock Origin Lite loaded successfully.');
        } catch (e) {
            console.error('Failed to load uBlock Origin Lite extension:', e);
        }
    }
    // 4. Disabled
    else {
        console.log('AdBlocker is DISABLED.');
    }

    createWindow();

    // Initialize Discord RPC if enabled
    const discordEnabled = store ? store.get('discordRpcEnabled', true) : true;
    if (discordEnabled) {
        discordRpc.connect();
    }

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    // IPC Handlers
    ipcMain.on('load-service', (event, service) => {
        console.log(`IPC: load - service received for ${service}`);
        loadService(service);
    });

    // Load a specific URL (only YT Music or SoundCloud allowed)
    ipcMain.on('load-url', (event, url) => {
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();

            // Validate URL
            const isYtMusic = host === 'music.youtube.com' || host === 'www.music.youtube.com';
            const isSoundCloud = host === 'soundcloud.com' || host === 'www.soundcloud.com' || host === 'm.soundcloud.com';

            if (!isYtMusic && !isSoundCloud) {
                console.log('Invalid URL rejected:', url);
                return;
            }

            // Determine service for track detection
            const serviceKey = isYtMusic ? 'yt' : 'sc';
            currentService = serviceKey;

            // Force recreate BrowserView to ensure clean state (fixes AdBlock/Interactivity issues)
            if (view) {
                console.log('Destroying existing BrowserView before loading URL...');
                mainWindow.setBrowserView(null);
                view.webContents.destroy();
                view = null;
            }

            console.log('Creating new BrowserView for URL...');
            view = new BrowserView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: false,
                    partition: 'persist:main',
                    preload: path.join(__dirname, 'preload-view.js')
                }
            });
            mainWindow.setBrowserView(view);

            const viewSession = view.webContents.session;
            const enabled = store ? store.get('adBlockerEnabled', true) : true;
            if (enabled && adBlocker) {
                adBlocker.enableBlockingInSession(viewSession);
            }

            // Ensure the view is attached (in case it was hidden by modal)
            mainWindow.setBrowserView(view);
            updateViewBounds();
            mainWindow.webContents.send('service-active', true);

            console.log(`Loading URL: ${url} `);
            view.webContents.loadURL(url).then(() => {
                console.log(`Successfully loaded URL: ${url} `);

                // Open DevTools for debugging - REMOVED for "Settings Only" restriction
                // view.webContents.openDevTools({ mode: 'detach' });

                view.webContents.insertCSS(AD_CSS);

                // Inject Ad-Skip Script (AdBlock Fix)
                injectAdSkipper(view);

                injectTrackDetection(serviceKey);

                // Start main process polling (bypasses broken preload IPC)
                startTrackPolling();

                applyVolume();
            }).catch(e => {
                console.error(`Failed to load URL: `, e);
            });
        } catch (e) {
            console.error('Invalid URL:', e.message);
        }
    });

    ipcMain.on('navigate', (event, action) => {
        if (!view) return;
        switch (action) {
            case 'back':
                if (view.webContents.canGoBack()) view.webContents.goBack();
                break;
            case 'forward':
                if (view.webContents.canGoForward()) view.webContents.goForward();
                break;
            case 'reload':
                // NUCLEAR RELOAD: User requested full app restart to fix breakage
                console.log('User requested Reload - Relaunching App...');
                app.relaunch();
                app.exit();
                break;
            case 'home':
                goHome();
                break;
        }
    });

    // Hide/Show BrowserView (for modals)
    ipcMain.on('hide-view', () => {
        console.log('IPC: hide-view received');
        if (view && mainWindow) {
            mainWindow.setBrowserView(null);
            console.log('BrowserView hidden for modal');
        }
    });

    ipcMain.on('show-view', () => {
        if (view && mainWindow) {
            mainWindow.setBrowserView(view);
            updateViewBounds();
            console.log('BrowserView shown after modal');
        }
    });

    // Lyrics Window Handler
    ipcMain.on('open-lyrics', () => {
        if (lyricsWindow) {
            lyricsWindow.focus();
            return;
        }

        lyricsWindow = new BrowserWindow({
            width: 400,
            height: 600,
            title: 'Spice Lyrics',
            icon: path.join(__dirname, 'icon.png'),
            frame: false, // Frameless to match main theme
            autoHideMenuBar: true,
            backgroundColor: '#121212',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true, // Must be true for contextBridge in preload.js to work
                preload: path.join(__dirname, 'preload.js')
            }
        });

        lyricsWindow.loadFile(path.join(__dirname, 'lyrics.html'));

        lyricsWindow.once('ready-to-show', () => {
            lyricsWindow.show();
            // Send last known track if available
            if (lastTrack) {
                lyricsWindow.webContents.send('lyrics-track-update', lastTrack);
            }
        });

        lyricsWindow.on('closed', () => {
            lyricsWindow = null;
        });
    });

    ipcMain.on('open-mini-player', () => {
        createMiniPlayerWindow();
    });

    ipcMain.handle('get-now-playing', () => {
        console.log('[Main] get-now-playing called. Returning:', lastTrack ? lastTrack.title : 'null');
        return lastTrack;
    });

    ipcMain.on('open-devtools', () => {
        console.log('[Main] open-devtools received');
        if (view) {
            view.webContents.openDevTools({ mode: 'detach' });
            console.log('Opening DevTools for BrowserView');
        } else if (mainWindow) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
            console.log('Opening DevTools for MainWindow');
        }
    });

    ipcMain.handle('fetch-lyrics', async (event, args) => {
        // args can be just {title, artist} (legacy) or {title, artist, provider}
        const { title, artist, album, provider = 'lrclib' } = args;
        console.log(`[Main] Fetching lyrics from[${provider}]for: ${title} - ${artist} `);

        try {
            if (provider === 'genius') {
                return await fetchGeniusLyrics(title, artist);
            } else if (provider === 'musixmatch') {
                return await fetchMusixMatchLyrics(title, artist);
            } else {
                // Default: LRCLIB
                return await fetchLrcLibLyrics(title, artist, album);
            }
        } catch (e) {
            console.error(`[Main] Error fetching from ${provider}: `, e);
            return null;
        }
    });

    // LRCLIB Implementation
    async function fetchLrcLibLyrics(title, artist, album) {
        const query = new URLSearchParams({
            track_name: title,
            artist_name: artist,
            album_name: album || ''
        });
        const url = `https://lrclib.net/api/get?${query.toString()}`;

        let res = await fetch(url);
        if (!res.ok) {
            console.log('[Main] LRCLIB direct fetch failed, trying search...');
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`;
            res = await fetch(searchUrl);
            if (res.ok) {
                const searchData = await res.json();
                if (searchData && searchData.length > 0) return searchData[0];
            }
            return null;
        }
        return await res.json();
    }

    // GENIUS Implementation
    async function fetchGeniusLyrics(title, artist) {
        // 1. Search Genius API
        const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(title + ' ' + artist)}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error('Genius search failed');

        const searchJson = await searchRes.json();
        const hit = searchJson?.response?.sections?.[0]?.hits?.[0]?.result;

        if (!hit || !hit.url) return null;
        console.log('[Main] Found Genius URL:', hit.url);

        // 2. Fetch Page HTML
        const pageRes = await fetch(hit.url);
        if (!pageRes.ok) throw new Error('Genius page fetch failed');
        const html = await pageRes.text();

        // 3. Parse HTML (Improved extraction)
        // Genius puts lyrics in multiple <div data-lyrics-container="true">...</div> elements
        // Use a more robust extraction that handles nested content
        let lyricsHtml = '';

        // Method 1: Try to find all lyrics containers
        const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
        let match;
        while ((match = containerRegex.exec(html)) !== null) {
            lyricsHtml += match[1] + '<br/>';
        }

        // Method 2: If that fails, try a broader search around "Lyrics__Container"
        if (!lyricsHtml) {
            const altRegex = /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
            while ((match = altRegex.exec(html)) !== null) {
                lyricsHtml += match[1] + '<br/>';
            }
        }

        if (!lyricsHtml) {
            console.log('[Main] Could not extract lyrics from Genius HTML');
            return null;
        }

        // Clean up HTML to Plain Text
        let plainText = lyricsHtml
            .replace(/<br\s*\/?>/gi, '\n') // br to newline
            .replace(/<[^>]+>/g, '') // remove other tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"');

        return {
            plainLyrics: plainText.trim(),
            syncedLyrics: null // Genius is text only
        };
    }

    // MUSIXMATCH Implementation (Experimental)
    async function fetchMusixMatchLyrics(title, artist) {
        // MusixMatch is very hard to scrape. We will try a search via google pattern or direct site search.
        // NOTE: This usually hits Captcha. This is a "Best Effort".

        const searchUrl = `https://www.musixmatch.com/search/${encodeURIComponent(title + ' ' + artist)}`;
        console.log('[Main] Searching MusixMatch:', searchUrl);

        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (res.status === 403 || res.status === 503) {
            return { plainLyrics: "MusixMatch blocked access (Captcha/Cloudflare). Please use Genius or LRCLIB." };
        }

        const html = await res.text();

        // Find song link in search results
        // <a class="title" href="/lyrics/..."
        const linkRegex = /href="(\/lyrics\/[^"]+)"/;
        const linkMatch = linkRegex.exec(html);

        if (!linkMatch) return null;

        const trackUrl = `https://www.musixmatch.com${linkMatch[1]}`;
        console.log('[Main] Found MusixMatch Track URL:', trackUrl);

        const trackRes = await fetch(trackUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const trackHtml = await trackRes.text();

        // Extract lyrics: <span class="lyrics__content__ok">...</span> or similar class
        const lyricRegex = /<span class="lyrics__content__ok"[^>]*>(.*?)<\/span>/gs;
        let fullLyrics = '';
        let m;
        while ((m = lyricRegex.exec(trackHtml)) !== null) {
            fullLyrics += m[1] + '\n';
        }

        if (!fullLyrics) {
            // Fallback for restricted lyrics
            return { plainLyrics: "Could not extract full lyrics from MusixMatch (Restricted/Login Required)." };
        }

        return {
            plainLyrics: fullLyrics.replace(/<[^>]+>/g, '').trim(),
            syncedLyrics: null
        };
    }

    // Main process receiving track info from Renderer (which got it from BrowserView)
    // scrobble-now-playing removed (duplicate)

    // Window Control Handlers
    ipcMain.on('window-minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.minimize();
    });

    ipcMain.on('window-maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.on('window-close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
    });

    let settingsWindow = null;

    function createSettingsWindow() {
        if (settingsWindow) {
            settingsWindow.focus();
            return;
        }

        settingsWindow = new BrowserWindow({
            width: 600,
            height: 600,
            backgroundColor: '#121212',
            frame: false, // Frameless for custom title bar
            titleBarStyle: 'hidden',
            titleBarOverlay: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
                // We can reuse preload or create a specific one if needed. 
                // For now reusing main preload for basic window functionality if we added it there, 
                // or just simple load for now since no specific IPC logic requested yet inside settings.
            }
        });

        settingsWindow.loadFile('settings.html');

        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
    }

    ipcMain.on('open-settings', () => {
        createSettingsWindow();
    });

    // Volume Logic
    const DEFAULT_VOL = 1.0;

    // Robust Volume Injection Script
    // This script runs on an interval in the webview to ensure volume is always applied
    // even if the video element changes (e.g. song switch, ad transition).
    const getVolumeScript = (gainValue) => `
        (function() {
            window.spiceVolume = ${gainValue};
            
            // Helper to apply immediately
            function apply() {
                try {
                    const media = document.querySelector('video') || document.querySelector('audio');
                    if (!media) return;

                    if (!window.boostCtx) {
                        const AudioContext = window.AudioContext || window.webkitAudioContext;
                        window.boostCtx = new AudioContext();
                        window.boostGain = window.boostCtx.createGain();
                        window.boostGain.connect(window.boostCtx.destination);
                    }

                    if (window.boostCtx.state === 'suspended') {
                        window.boostCtx.resume();
                    }

                    if (media !== window.lastBoostedMedia) {
                        if (window.boostSource) {
                            try { window.boostSource.disconnect(); } catch(e) {}
                        }
                        window.boostSource = window.boostCtx.createMediaElementSource(media);
                        window.boostSource.connect(window.boostGain);
                        window.lastBoostedMedia = media;
                    }

                    if (window.boostGain.gain.value !== window.spiceVolume) {
                        window.boostGain.gain.value = window.spiceVolume;
                    }
                } catch(e) {
                    // console.error(e);
                }
            }

            // Apply immediately
            apply();

            if (window.spiceVolInterval) return; 

            window.spiceVolInterval = setInterval(() => {
                apply();
            }, 1000); 
        })();
    `;

    // Apply volume to current view
    // Volume Logic
    function applyVolume(vol) {
        if (vol !== undefined) currentVolume = vol;
        if (!view) return;
        view.webContents.executeJavaScript(getVolumeScript(currentVolume)).catch(() => { });
    }

    // Get Volume IPC
    ipcMain.handle('get-volume', () => {
        return DEFAULT_VOL;
    });

    // Set Volume IPC
    ipcMain.on('set-volume', async (event, gainValue) => {
        currentVolume = gainValue;
        applyVolume(gainValue);
        if (store) store.set('volume', gainValue);
    });

    // Toggle Volume (Legacy)
    ipcMain.on('toggle-volume', async () => {
        const target = currentVolume > 1.0 ? 1.0 : 10.0;
        currentVolume = target;
        applyVolume(target);
        if (mainWindow) mainWindow.webContents.send('volume-changed', target);
    });





    // Apply volume on navigation
    // We hook into the existing 'did-navigate' listeners via a helper or just add a new one?
    // Since 'view' is recreated in load-service, we need to ensure listeners are attached.
    // The load-service logic destroys 'view', so we need to call applyVolume() AFTER it's created.
    // We'll add it to the 'load-url' handler logic.

    // Settings IPC
    ipcMain.handle('get-settings', () => {
        return {
            adBlockerEnabled: store ? store.get('adBlockerEnabled', true) : true,
            // Return type explicitly so UI can show correct state
            adBlockerType: store ? store.get('adBlockerType', 'spice') : 'spice',
            defaultService: store ? store.get('defaultService', 'yt') : 'yt',
            discordRpcEnabled: store ? store.get('discordRpcEnabled', true) : true
        };
    });

    ipcMain.on('set-adblocker', (event, value) => {
        // Value can be boolean (legacy) or string (new)
        let type = 'spice'; // Default
        if (typeof value === 'boolean') {
            type = value ? 'spice' : 'none';
        } else if (typeof value === 'string') {
            type = value;
        }

        console.log(`IPC: Setting AdBlocker to [${type}]`);

        if (store) {
            store.set('adBlockerType', type);
            // Sync legacy boolean for other parts of the app that might read it
            store.set('adBlockerEnabled', type !== 'none');
            console.log('IPC: Settings saved to store.');
        }

        // For any change, we force a restart to ensure clean state and correct extension loading
        console.log('IPC: Restarting app to apply AdBlocker settings...');
        app.relaunch();
        app.exit();
    });

    ipcMain.on('set-default-service', (event, service) => {
        if (store) store.set('defaultService', service);
        console.log(`Default Service set to ${service}. Restarting...`);
        app.relaunch();
        app.exit();
    });

    ipcMain.on('set-discord-rpc', (event, enabled) => {
        if (store) store.set('discordRpcEnabled', enabled);
        if (enabled) {
            discordRpc.connect();
            console.log('Discord RPC: ENABLED');
        } else {
            discordRpc.clearPresence();
            discordRpc.disconnect();
            console.log('Discord RPC: DISABLED');
        }
    });

    // Renderer Logging Bridge
    ipcMain.on('renderer-log', (event, { level, args }) => {
        // formatting args for main console
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        console.log(`[View:${level}] ${msg}`);
    });

    // Scrobbler IPC Handlers
    ipcMain.handle('get-scrobble-settings', () => {
        if (!scrobbler) return null;
        return scrobbler.getSettings();
    });

    ipcMain.on('save-lastfm-credentials', (event, { apiKey, secret }) => {
        if (scrobbler) {
            scrobbler.saveLastFmCredentials(apiKey, secret);
            console.log('Last.fm credentials saved');
        }
    });

    ipcMain.on('save-listenbrainz-token', async (event, token) => {
        if (scrobbler) {
            const result = await scrobbler.saveListenBrainzToken(token);
            event.sender.send('listenbrainz-validation', result);
            console.log('ListenBrainz token saved, valid:', result.valid);
        }
    });

    ipcMain.on('toggle-lastfm', (event, enabled) => {
        if (scrobbler) {
            scrobbler.setLastFmEnabled(enabled);
            console.log('Last.fm enabled:', enabled);
        }
    });

    ipcMain.on('toggle-listenbrainz', (event, enabled) => {
        if (scrobbler) {
            scrobbler.setListenBrainzEnabled(enabled);
            console.log('ListenBrainz enabled:', enabled);
        }
    });

    ipcMain.handle('lastfm-authenticate', async (event) => {
        if (!scrobbler) return { error: 'Scrobbler not initialized' };

        try {
            const authUrl = await scrobbler.startLastFmAuth();

            // Create auth window
            const authWindow = new BrowserWindow({
                width: 500,
                height: 700,
                backgroundColor: '#121212',
                parent: mainWindow,
                modal: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            authWindow.setMenuBarVisibility(false);
            authWindow.loadURL(authUrl);

            return new Promise((resolve) => {
                let authCompleted = false;

                // Monitor URL changes - Last.fm redirects after auth
                const checkAuth = async () => {
                    if (authCompleted) return;

                    try {
                        const currentUrl = authWindow.webContents.getURL();

                        // After authorization, Last.fm shows a page saying "you can close this window"
                        // or redirects to a confirmation page. We detect this and complete auth.
                        if (currentUrl.includes('last.fm') &&
                            (currentUrl.includes('token=') ||
                                currentUrl.includes('/api/auth') ||
                                !currentUrl.includes('/api/auth/?api_key'))) {

                            // Try to complete the auth
                            try {
                                const session = await scrobbler.completeLastFmAuth();
                                authCompleted = true;
                                authWindow.close();
                                resolve({ success: true, username: session.username });
                            } catch (e) {
                                // Not ready yet, keep waiting
                            }
                        }
                    } catch (e) {
                        // Window might be closing
                    }
                };

                // Check periodically and on navigation
                authWindow.webContents.on('did-navigate', checkAuth);
                authWindow.webContents.on('did-navigate-in-page', checkAuth);
                const checkInterval = setInterval(checkAuth, 1000);

                // Handle window close
                authWindow.on('closed', async () => {
                    clearInterval(checkInterval);

                    if (!authCompleted) {
                        // User closed window - try to complete auth one more time
                        // (they may have authorized but we didn't catch the redirect)
                        try {
                            const session = await scrobbler.completeLastFmAuth();
                            resolve({ success: true, username: session.username });
                        } catch (e) {
                            resolve({ error: 'Authentication cancelled or failed' });
                        }
                    }
                });
            });

        } catch (err) {
            return { error: err.message };
        }
    });

    // Keep for backwards compatibility, but primary flow is now automatic
    ipcMain.handle('lastfm-complete-auth', async () => {
        if (!scrobbler) return { error: 'Scrobbler not initialized' };
        try {
            const session = await scrobbler.completeLastFmAuth();
            return { success: true, username: session.username };
        } catch (err) {
            return { error: err.message };
        }
    });

    // Get Volume IPC
    ipcMain.handle('get-volume', () => {
        return store ? store.get('volume', DEFAULT_VOL) : DEFAULT_VOL;
    });

    // Last.fm API Wizard - Automates API credential setup
    ipcMain.handle('lastfm-api-wizard', async () => {
        return new Promise((resolve) => {
            const wizardWindow = new BrowserWindow({
                width: 900,
                height: 700,
                backgroundColor: '#1a1a1a',
                parent: mainWindow,
                modal: false,
                title: 'Last.fm API Setup',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            wizardWindow.setMenuBarVisibility(false);
            wizardWindow.loadURL('https://www.last.fm/api/account/create');

            let credentialsFound = false;

            // Function to check for credentials on the current page
            const checkForCredentials = async () => {
                if (credentialsFound) return;

                try {
                    const url = wizardWindow.webContents.getURL();
                    console.log('[API Wizard] Current URL:', url);

                    // After form submission, Last.fm shows the API account page with credentials
                    // The URL pattern is typically /api/account or shows the created app
                    if (url.includes('last.fm/api/account') && !url.includes('/create')) {
                        // Try to extract credentials from the page
                        const result = await wizardWindow.webContents.executeJavaScript(`
                        (function() {
                            try {
                                // Look for the API Key and Secret in the page
                                // Last.fm typically shows these in a definition list or similar structure
                                const pageText = document.body.innerText;
                                
                                // Try multiple extraction methods
                                let apiKey = null;
                                let secret = null;
                                
                                // Method 1: Look for labeled elements
                                const allElements = document.querySelectorAll('*');
                                for (const el of allElements) {
                                    const text = el.innerText || '';
                                    
                                    // Check for API Key pattern (32 hex characters)
                                    if (!apiKey) {
                                        const keyMatch = text.match(/API\\s*[Kk]ey[:\\s]*([a-f0-9]{32})/i);
                                        if (keyMatch) apiKey = keyMatch[1];
                                    }
                                    
                                    // Check for Shared Secret pattern
                                    if (!secret) {
                                        const secretMatch = text.match(/[Ss]hared\\s*[Ss]ecret[:\\s]*([a-f0-9]{32})/i);
                                        if (secretMatch) secret = secretMatch[1];
                                    }
                                }
                                
                                // Method 2: Look for code/pre elements with 32-char hex strings
                                if (!apiKey || !secret) {
                                    const codeElements = document.querySelectorAll('code, pre, input[type="text"], .api-key, .secret');
                                    const hexStrings = [];
                                    
                                    for (const el of codeElements) {
                                        const val = el.value || el.textContent || '';
                                        const match = val.match(/[a-f0-9]{32}/gi);
                                        if (match) hexStrings.push(...match);
                                    }
                                    
                                    // Also scan for any 32-char hex in the page
                                    const allHex = pageText.match(/[a-f0-9]{32}/gi) || [];
                                    hexStrings.push(...allHex);
                                    
                                    // Dedupe and take first two unique as key and secret
                                    const unique = [...new Set(hexStrings)];
                                    if (unique.length >= 2) {
                                        if (!apiKey) apiKey = unique[0];
                                        if (!secret) secret = unique[1];
                                    } else if (unique.length === 1 && !apiKey) {
                                        apiKey = unique[0];
                                    }
                                }
                                
                                // Method 3: Look for specific Last.fm page structure
                                const dtElements = document.querySelectorAll('dt');
                                for (const dt of dtElements) {
                                    const label = dt.textContent.toLowerCase();
                                    const dd = dt.nextElementSibling;
                                    if (dd && dd.tagName === 'DD') {
                                        const value = dd.textContent.trim();
                                        if (label.includes('api key') && /^[a-f0-9]{32}$/i.test(value)) {
                                            apiKey = value;
                                        }
                                        if (label.includes('secret') && /^[a-f0-9]{32}$/i.test(value)) {
                                            secret = value;
                                        }
                                    }
                                }
                                
                                if (apiKey && secret) {
                                    return { success: true, apiKey, secret };
                                }
                                
                                return { success: false, found: { apiKey: !!apiKey, secret: !!secret } };
                            } catch (e) {
                                return { success: false, error: e.message };
                            }
                        })();
                    `);

                        console.log('[API Wizard] Extraction result:', result);

                        if (result.success && result.apiKey && result.secret) {
                            credentialsFound = true;

                            // Save credentials via scrobbler
                            if (scrobbler) {
                                scrobbler.saveLastFmCredentials(result.apiKey, result.secret);
                                console.log('[API Wizard] Credentials saved!');
                            }

                            wizardWindow.close();
                            resolve({ success: true, apiKey: result.apiKey, secret: result.secret });
                        }
                    }
                } catch (e) {
                    console.error('[API Wizard] Check error:', e);
                }
            };

            // Monitor navigation
            wizardWindow.webContents.on('did-navigate', () => {
                setTimeout(checkForCredentials, 1000);
            });

            wizardWindow.webContents.on('did-navigate-in-page', () => {
                setTimeout(checkForCredentials, 1000);
            });

            // Also check periodically in case of SPA-style updates
            const checkInterval = setInterval(() => {
                if (!wizardWindow.isDestroyed()) {
                    checkForCredentials();
                } else {
                    clearInterval(checkInterval);
                }
            }, 2000);

            // Handle window close
            wizardWindow.on('closed', () => {
                clearInterval(checkInterval);
                if (!credentialsFound) {
                    resolve({ cancelled: true });
                }
            });
        });
    });

    ipcMain.on('disconnect-lastfm', () => {
        if (scrobbler) {
            scrobbler.disconnectLastFm();
            console.log('Last.fm disconnected');
        }
    });

    ipcMain.on('disconnect-listenbrainz', () => {
        if (scrobbler) {
            scrobbler.disconnectListenBrainz();
            console.log('ListenBrainz disconnected');
        }
    });

    ipcMain.on('scrobble-now-playing', (event, track) => {
        console.log('========================================');
        console.log('[Main] IPC RECEIVED: scrobble-now-playing');
        console.log('[Main] Track data:', JSON.stringify(track));
        console.log('========================================');

        // Normalize track object (fix mismatch where injection uses 'track' but we expect 'title')
        if (track && track.track && !track.title) {
            track.title = track.track;
        }

        // Check if valid track
        if (!track || !track.title) {
            console.log('[Main] Invalid track, ignoring.');
            return;
        }

        lastTrack = track; // Save immediately
        console.log(`[Main] lastTrack UPDATED: ${lastTrack.title}`);

        // Enhance track object
        if (currentService === 'yt') {
            // Album art fix for YT Music (high res)
            if (track.artwork && track.artwork.includes('ggpht.com')) {
                track.artwork = track.artwork.replace(/w\d+-h\d+/, 'w1200-h1200');
                // Update lastTrack with enhanced artwork too
                lastTrack.artwork = track.artwork;
            }
        }

        // Scrobble (Last.fm / ListenBrainz)
        if (scrobbler) {
            scrobbler.updateNowPlaying(track);
        }

        // Update Mini Player State
        miniPlayerServer.updateState({
            track: {
                title: track.track,
                artist: track.artist,
                art: track.artwork || track.albumArt, // Use artwork (enhanced) or albumArt
                duration: track.duration
            },
            paused: false,
            volume: currentVolume
        });

        // Update Discord RPC if enabled
        const discordEnabled = store ? store.get('discordRpcEnabled', true) : true;
        if (discordEnabled) {
            discordRpc.updatePresence({ ...track, service: currentService });
        }

        // Update Lyrics Window if open
        if (lyricsWindow) {
            lyricsWindow.webContents.send('lyrics-track-update', track);
        }
    });

    // Track last RPC update time to avoid rate limiting
    let lastRpcUpdate = 0;
    let lastExpectedTime = 0;
    let lastUpdateTime = 0;

    ipcMain.on('scrobble-track-progress', (event, progress) => {
        // Forward to lyrics window if open
        if (lyricsWindow) {
            lyricsWindow.webContents.send('lyrics-progress-update', progress);
        }

        // Sync Discord RPC on Pause/Seek
        if (discordRpc && lastTrack) {
            const now = Date.now();
            const isPaused = progress.paused;
            const currentTime = progress.currentTime;

            // Initialize state if needed
            if (lastTrack.paused === undefined) lastTrack.paused = !isPaused; // Force update on first run

            let shouldUpdate = false;

            // Check 1: Pause State Changed
            if (lastTrack.paused !== isPaused) {
                console.log(`[Main] Pause state changed: ${lastTrack.paused} -> ${isPaused}`);
                lastTrack.paused = isPaused;
                shouldUpdate = true;
            }

            // Check 2: Seek/Time Drift (only if playing)
            if (!isPaused) {
                // Expected time since last update
                const timePassed = (now - lastUpdateTime) / 1000;
                const expectedCurrentTime = lastExpectedTime + timePassed;

                // If actual time differs from expected by > 2 seconds (seek happened)
                if (Math.abs(currentTime - expectedCurrentTime) > 3) { // 3s tolerance
                    console.log(`[Main] Seek detected: Expected ${expectedCurrentTime.toFixed(1)}, Got ${currentTime.toFixed(1)}`);
                    shouldUpdate = true;
                }
            }

            // Update Reference Time
            lastExpectedTime = currentTime;
            lastUpdateTime = now;

            // Update global track state immediately
            lastTrack.currentTime = currentTime;
            lastTrack.duration = progress.duration || lastTrack.duration;

            if (shouldUpdate) {

                // Rate limit updates logic with trailing edge
                const timeSinceLast = now - lastRpcUpdate;
                const limit = isPaused ? 500 : 2000; // Faster updates for pause, 2s for seeks

                if (timeSinceLast > limit) {
                    // Can update immediately
                    if (discordRpc.pendingUpdate) {
                        clearTimeout(discordRpc.pendingUpdate);
                        discordRpc.pendingUpdate = null;
                    }
                    discordRpc.updatePresence(lastTrack);
                    lastRpcUpdate = now;
                } else {
                    // Rate limited - schedule trailing update
                    if (!discordRpc.pendingUpdate) {
                        console.log(`[Main] RPC rate limited, scheduling update in ${limit - timeSinceLast}ms`);
                        discordRpc.pendingUpdate = setTimeout(() => {
                            discordRpc.pendingUpdate = null;
                            console.log('[Main] Sending buffered RPC update');
                            discordRpc.updatePresence(lastTrack);
                            lastRpcUpdate = Date.now();
                        }, limit - timeSinceLast + 100);
                    }
                }
            }
            // Feed progress to Scrobbler (for progress-based scrobbling)
            if (scrobbler) {
                scrobbler.updateProgress(currentTime, progress.duration);
            }

            // Update Mini Player / Web Interface
            miniPlayerServer.updateState({
                currentTime: currentTime,
                paused: isPaused,
                shuffle: progress.shuffle,
                repeat: progress.repeat,
                volume: currentVolume
            });
        }
    });

    ipcMain.on('scrobble-track-end', () => {
        if (scrobbler) {
            scrobbler.onTrackEnd();
        }
    });

    // injectTrackDetection moved to global scope

    // Enhanced Native AdBlocker
    const AD_DOMAINS = [
        'doubleclick.net',
        'googleadservices.com',
        'googlesyndication.com',
        'moatads.com',
        'g.doubleclick.net'
    ];


    function setupAdBlocker(enable) {
        if (enable) {
            if (adBlocker) {
                adBlocker.enableBlockingInSession(session.defaultSession);
                console.log('Library AdBlocker: ENABLED');
            } else {
                ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
                    adBlocker = blocker;
                    adBlocker.enableBlockingInSession(session.defaultSession);
                    console.log('Library AdBlocker: ENABLED (Lazy Init)');
                });
            }
        } else {
            if (adBlocker) {
                adBlocker.disableBlockingInSession(session.defaultSession);
                console.log('Library AdBlocker: DISABLED');
            }
        }
    }

});
