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

const SERVICES = {
    yt: 'https://music.youtube.com',
    sc: 'https://soundcloud.com'
};

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
}

function updateViewBounds() {
    if (!view || !mainWindow) return;
    const bounds = mainWindow.getBounds();
    // Title bar: 40px. No Top Nav. Total 40px offset.
    view.setBounds({ x: 0, y: 40, width: bounds.width, height: bounds.height - 40 });
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
        console.log('Reuse logic invoked (should be unreachable if view is destroyed)');
    }

    updateViewBounds();

    // Notify renderer that a service is active (to show top bar)
    mainWindow.webContents.send('service-active', true);

    console.log(`Loading service URL: ${SERVICES[serviceKey]}`);
    view.webContents.loadURL(SERVICES[serviceKey]).then(() => {
        console.log(`Successfully loaded ${serviceKey}`);
        // Inject CSS for Cosmetic Blocking
        view.webContents.insertCSS(AD_CSS);

        // Inject Ad-Skip Script
        view.webContents.executeJavaScript(`
            (function() {
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
        `);

        // Inject Track Detection Script based on service
        injectTrackDetection(serviceKey);
    }).catch(e => {
        console.error(`Failed to load ${serviceKey}:`, e);
    });

}

function goHome() {
    console.log('goHome() called');
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



app.whenReady().then(() => {
    initStore();

    // Library AdBlocker DISABLED - causes black screen on YouTube Music
    // Using manual ad-skip script instead (injected in loadService)
    const adBlockerEnabled = store ? store.get('adBlockerEnabled', true) : true;
    if (adBlockerEnabled) {
        console.log('Ad blocking: Using manual script method (library blocker disabled due to black screen issues)');
        // The manual ad-skip script in loadService() handles ad blocking
        // It clicks skip buttons and fast-forwards unskippable ads
    }

    console.log('Creating window - adBlocker status:', !!adBlocker);
    createWindow();

    // Initialize Discord RPC if enabled
    const discordEnabled = store ? store.get('discordRpcEnabled', true) : true;
    if (discordEnabled) {
        discordRpc.connect();
    }

    // Register media keys if possible (global shortcuts might conflict, but requested "if possible")
    // Better needed: BrowserView usually handles media keys automatically if focused.

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('load-service', (event, service) => {
    console.log(`IPC: load-service received for ${service}`);
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

        // Create BrowserView if needed
        if (!view) {
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
        }

        updateViewBounds();
        mainWindow.webContents.send('service-active', true);

        console.log(`Loading URL: ${url}`);
        view.webContents.loadURL(url).then(() => {
            console.log(`Successfully loaded URL: ${url}`);
            view.webContents.insertCSS(AD_CSS);
            injectTrackDetection(serviceKey);
        }).catch(e => {
            console.error(`Failed to load URL:`, e);
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
            view.webContents.reload();
            break;
        case 'home':
            goHome();
            break;
    }
});

// Hide/Show BrowserView (for modals)
ipcMain.on('hide-view', () => {
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

let isBoosted = false;

ipcMain.on('toggle-volume', async () => {
    if (!view) return;

    isBoosted = !isBoosted;
    const gainValue = isBoosted ? 10.0 : 1.0; // 10.0 = 1000%

    const code = `
        (function() {
            try {
                const mediaElement = document.querySelector('video') || document.querySelector('audio');
                if (!mediaElement) return;

                if (!window.boostCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    window.boostCtx = new AudioContext();
                    window.boostSource = window.boostCtx.createMediaElementSource(mediaElement);
                    window.boostGain = window.boostCtx.createGain();
                    window.boostSource.connect(window.boostGain);
                    window.boostGain.connect(window.boostCtx.destination);
                }
                
                window.boostGain.gain.value = ${gainValue};
                console.log('Volume Boost set to: ${gainValue}');
            } catch(e) {
                console.error('Boost Error:', e);
            }
        })();
    `;

    try {
        await view.webContents.executeJavaScript(code);
    } catch (e) {
        console.error('Failed to execute boost script:', e);
    }
});

// Volume slider handler
ipcMain.on('set-volume', async (event, gainValue) => {
    if (!view) return;

    const code = `
        (function() {
            try {
                const mediaElement = document.querySelector('video') || document.querySelector('audio');
                if (!mediaElement) {
                    console.log('No media element found');
                    return;
                }

                if (!window.boostCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    window.boostCtx = new AudioContext();
                    window.boostSource = window.boostCtx.createMediaElementSource(mediaElement);
                    window.boostGain = window.boostCtx.createGain();
                    window.boostSource.connect(window.boostGain);
                    window.boostGain.connect(window.boostCtx.destination);
                }
                
                window.boostGain.gain.value = ${gainValue};
                console.log('Volume Boost set to:', ${gainValue});
            } catch(e) {
                console.error('Boost Error:', e);
            }
        })();
    `;

    try {
        await view.webContents.executeJavaScript(code);
        console.log('Volume set to:', gainValue);
    } catch (e) {
        console.error('Failed to execute volume script:', e);
    }
});

// Settings IPC
ipcMain.handle('get-settings', () => {
    return {
        adBlockerEnabled: store ? store.get('adBlockerEnabled', true) : true,
        defaultService: store ? store.get('defaultService', 'yt') : 'yt',
        discordRpcEnabled: store ? store.get('discordRpcEnabled', true) : true
    };
});

ipcMain.on('set-adblocker', (event, enabled) => {
    if (store) store.set('adBlockerEnabled', enabled);
    setupAdBlocker(enabled);
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
    console.log('[Main] Now playing received:', track.track, 'by', track.artist);
    if (scrobbler) {
        scrobbler.updateNowPlaying(track);
    }
    // Update Discord RPC if enabled
    const discordEnabled = store ? store.get('discordRpcEnabled', true) : true;
    if (discordEnabled) {
        discordRpc.updatePresence({ ...track, service: currentService });
    }
});

ipcMain.on('scrobble-track-end', () => {
    if (scrobbler) {
        scrobbler.onTrackEnd();
    }
});

// Track Detection Script Injection
function injectTrackDetection(serviceKey) {
    if (!view) return;

    let script = '';

    if (serviceKey === 'yt') {
        // YouTube Music track detection
        script = `
            (function() {
                console.log('[Spice Scrobbler] YouTube Music track detection injected');
                
                let lastTrack = null;
                let checkInterval = null;
                
                function getTrackInfo() {
                    const titleEl = document.querySelector('.content-info-wrapper .title, ytmusic-player-bar .title');
                    const artistEl = document.querySelector('.content-info-wrapper .byline a, ytmusic-player-bar .byline a');
                    const albumEl = document.querySelector('ytmusic-player-bar .subtitle .yt-formatted-string[href*="browse"]');
                    const video = document.querySelector('video');
                    
                    // Get album art - YouTube Music uses the thumbnail in the player bar
                    const albumArtEl = document.querySelector('ytmusic-player-bar .image img, .thumbnail-image-wrapper img, img.ytmusic-player-bar');
                    let albumArt = albumArtEl?.src || '';
                    // Get higher resolution version if possible (replace size params)
                    if (albumArt) {
                        albumArt = albumArt.replace(/w\d+-h\d+/, 'w1200-h1200').replace(/=w\d+-h\d+/, '=w1200-h1200').replace(/s\d+-/, 's1200-');
                    }
                    
                    if (!titleEl || !artistEl) return null;
                    
                    const title = titleEl.textContent?.trim();
                    const artist = artistEl.textContent?.trim();
                    const album = albumEl?.textContent?.trim() || '';
                    const duration = video?.duration || 0;
                    
                    if (!title || !artist) return null;
                    
                    return { track: title, artist, album, duration, albumArt };
                }
                
                function checkForTrackChange() {
                    const video = document.querySelector('video');
                    if (!video || video.paused) return;
                    
                    const track = getTrackInfo();
                    if (!track) return;
                    
                    const trackKey = track.artist + ' - ' + track.track;
                    if (lastTrack !== trackKey) {
                        lastTrack = trackKey;
                        console.log('[Spice Scrobbler] Now Playing:', trackKey);
                        
                        // Send to main process via global function exposed by preload
                        if (typeof window.spiceReportTrack === 'function') {
                            window.spiceReportTrack(track);
                        }
                    }
                }
                
                // Check every 2 seconds
                checkInterval = setInterval(checkForTrackChange, 2000);
                
                // Also check on video play events
                document.addEventListener('play', (e) => {
                    if (e.target.tagName === 'VIDEO') {
                        setTimeout(checkForTrackChange, 500);
                    }
                }, true);
            })();
        `;
    } else if (serviceKey === 'sc') {
        // SoundCloud track detection
        script = `
            (function() {
                console.log('[Spice Scrobbler] SoundCloud track detection injected');
                
                let lastTrack = null;
                
                function getTrackInfo() {
                    const titleEl = document.querySelector('.playbackSoundBadge__titleLink span:last-child');
                    const artistEl = document.querySelector('.playbackSoundBadge__lightLink');
                    
                    if (!titleEl || !artistEl) return null;
                    
                    const title = titleEl.textContent?.trim();
                    const artist = artistEl.textContent?.trim();
                    
                    if (!title || !artist) return null;
                    
                    // Get album art from SoundCloud player
                    const albumArtEl = document.querySelector('.playbackSoundBadge__avatar .image span');
                    let albumArt = '';
                    if (albumArtEl) {
                        // SoundCloud uses background-image style
                        const bgImage = getComputedStyle(albumArtEl).backgroundImage;
                        const match = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
                        if (match) {
                            albumArt = match[1].replace(/-t\d+x\d+/, '-t500x500');
                        }
                    }
                    
                    // SoundCloud doesn't always have duration easily accessible
                    const progressEl = document.querySelector('.playbackTimeline__duration span[aria-hidden="true"]');
                    let duration = 0;
                    if (progressEl) {
                        const parts = progressEl.textContent.split(':');
                        if (parts.length === 2) {
                            duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        } else if (parts.length === 3) {
                            duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                        }
                    }
                    
                    return { track: title, artist, album: '', duration, albumArt };
                }
                
                function checkForTrackChange() {
                    const playBtn = document.querySelector('.playControl');
                    if (!playBtn || !playBtn.classList.contains('playing')) return;
                    
                    const track = getTrackInfo();
                    if (!track) return;
                    
                    const trackKey = track.artist + ' - ' + track.track;
                    if (lastTrack !== trackKey) {
                        lastTrack = trackKey;
                        console.log('[Spice Scrobbler] Now Playing:', trackKey);
                        
                        if (typeof window.spiceReportTrack === 'function') {
                            window.spiceReportTrack(track);
                        }
                    }
                }
                
                // Check every 2 seconds
                setInterval(checkForTrackChange, 2000);
            })();
        `;
    }

    if (script) {
        view.webContents.executeJavaScript(script).catch(err => {
            console.error('[Scrobbler] Failed to inject track detection:', err);
        });
    }
}

// Enhanced Native AdBlocker
const AD_DOMAINS = [
    'doubleclick.net',
    'googleadservices.com',
    'googlesyndication.com',
    'moatads.com',
    'g.doubleclick.net'
];

const AD_CSS = `
    .video-ads, .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay,
    ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-compact-promoted-item-renderer,
    .ytd-action-companion-ad-renderer, .ytd-search-pyv-renderer,
    #player-ads, .ad-container, .masthead-ad-control {
        display: none !important;
    }
`;

function applyAdBlockerToSession(targetSession) {
    const filter = {
        urls: ["<all_urls>"]
    };

    targetSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        const url = details.url.toLowerCase();

        // Block known ad domains
        if (
            url.includes('doubleclick') ||
            url.includes('googleadservices') ||
            url.includes('googlesyndication') ||
            url.includes('moatads')
        ) {
            console.log('BLOCKED (Domain):', details.url.substring(0, 80));
            return callback({ cancel: true });
        }

        // Block YouTube/Google ad patterns
        if (
            url.includes('/pagead/') ||
            url.includes('/api/stats/ads') ||
            url.includes('/ptracking') ||
            url.includes('&adformat=') ||
            url.includes('?adformat=') ||
            url.includes('pltype=adhost') ||
            url.includes('ctier=a')
        ) {
            console.log('BLOCKED (Pattern):', details.url.substring(0, 80));
            return callback({ cancel: true });
        }

        callback({ cancel: false });
    });
    console.log('AdBlocker applied to session');
}

function setupAdBlocker(enable) {
    if (enable) {
        applyAdBlockerToSession(session.defaultSession);
        console.log('Native AdBlocker: ENABLED');
    } else {
        session.defaultSession.webRequest.onBeforeRequest({ urls: [] }, (details, callback) => {
            callback({ cancel: false });
        });
        console.log('Native AdBlocker: DISABLED');
    }
}
