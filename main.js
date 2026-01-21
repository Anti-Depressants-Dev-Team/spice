const { app, BrowserWindow, BrowserView, ipcMain, shell, session } = require('electron');
const path = require('path');
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('node-fetch');

let store;
let mainWindow;
let view;
let adBlocker = null;

const SERVICES = {
    yt: 'https://music.youtube.com',
    sc: 'https://soundcloud.com'
};

async function initStore() {
    try {
        const { default: Store } = await import('electron-store');
        store = new Store();
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
    mainWindow.loadFile('index.html').then(() => {
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

    // Save state - DISABLE for now to favor explicit Default Setting
    // if (store) store.set('lastService', serviceKey);

    // Create or update BrowserView
    if (!view) {
        console.log('Creating new BrowserView...');
        view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'persist:main' // Use a named partition
            }
        });
        mainWindow.setBrowserView(view);
        console.log('BrowserView set to mainWindow');

        // Apply library adblocker to the BrowserView's session
        const viewSession = view.webContents.session;
        const enabled = store ? store.get('adBlockerEnabled', true) : true;
        if (enabled && adBlocker) {
            adBlocker.enableBlockingInSession(viewSession);
            console.log('Library AdBlocker applied to BrowserView session');
        }
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
    mainWindow.webContents.send('service-active', false);
}



app.whenReady().then(async () => {
    await initStore();

    // Initialize Library AdBlocker with cosmetic filtering DISABLED
    const enabled = store ? store.get('adBlockerEnabled', true) : true;
    if (enabled) {
        try {
            console.log('Initializing Library AdBlocker...');
            adBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
                enableCompression: true
            });
            // Enable blocking but WITHOUT cosmetic filtering to prevent black screen
            adBlocker.enableBlockingInSession(session.defaultSession);
            console.log('Library AdBlocker ENABLED - adBlocker object ready:', !!adBlocker);
        } catch (err) {
            console.error('Failed to initialize library blocker:', err);
        }
    }

    console.log('Creating window - adBlocker status:', !!adBlocker);
    createWindow();

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
        defaultService: store ? store.get('defaultService', 'yt') : 'yt'
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
