/**
 * Preload script for BrowserView
 * Exposes a global function for track detection scripts to report what's playing
 */

const { ipcRenderer, webFrame } = require('electron');

let spicePolicy;
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
        spicePolicy = window.trustedTypes.createPolicy('spice-policy', {
            createHTML: (string) => string,
            createScript: (string) => string
        });
    } catch (e) {
        // Policy might be registered already
    }
}

function getTrustedHTML(str) {
    return spicePolicy ? spicePolicy.createHTML(str) : str;
}

function getTrustedScript(str) {
    return spicePolicy ? spicePolicy.createScript(str) : str;
}

// Forward console logs to main process for debugging
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
    try {
        const safeArgs = args.map(a => {
            if (typeof a === 'object') {
                try {
                    return JSON.stringify(a);
                } catch (e) {
                    return String(a);
                }
            }
            return String(a);
        });
        ipcRenderer.send('renderer-log', { level: 'INFO', args: safeArgs });
    } catch (e) {
        // ignore logging errors
    }
    originalLog(...args);
};

console.warn = (...args) => {
    try {
        const safeArgs = args.map(a => String(a));
        ipcRenderer.send('renderer-log', { level: 'WARN', args: safeArgs });
    } catch (e) { }
    originalWarn(...args);
};

console.error = (...args) => {
    try {
        const safeArgs = args.map(a => String(a));
        ipcRenderer.send('renderer-log', { level: 'ERROR', args: safeArgs });
    } catch (e) { }
    originalError(...args);
};

window.spiceReportTrack = function (track) {
    console.log('[BrowserView Preload] spiceReportTrack CALLED:', track?.track, 'by', track?.artist);
    console.log('[BrowserView Preload] ipcRenderer available:', typeof ipcRenderer);
    console.log('[BrowserView Preload] ipcRenderer.send available:', typeof ipcRenderer?.send);
    try {
        console.log('[BrowserView Preload] Sending IPC: scrobble-now-playing');
        ipcRenderer.send('scrobble-now-playing', track);
        console.log('[BrowserView Preload] IPC SENT SUCCESSFULLY');
    } catch (e) {
        console.error('[BrowserView Preload] IPC SEND FAILED:', e.message);
        originalError('[BrowserView Preload] Failed to send IPC:', e);
    }
};

window.spiceReportProgress = function (progress) {
    ipcRenderer.send('scrobble-track-progress', progress);
};

// NUCLEAR OPTION 1: Inject CSS Synchronously via webFrame
const AD_CSS = `
    .video-ads, .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay,
    ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-compact-promoted-item-renderer,
    .ytd-action-companion-ad-renderer, .ytd-search-pyv-renderer,
    #player-ads, .ad-container, .masthead-ad-control,
    .ytp-ad-button, .ytp-ad-progress-list, .ytp-ad-player-overlay,
    div.ad-showing, div.ad-interrupting {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
`;

try {
    webFrame.insertCSS(AD_CSS);
    console.log('[Preload] Aggressive CSS Injected (via webFrame)');
} catch (e) {
    console.error('[Preload] Failed to inject CSS:', e);
}

// NUCLEAR OPTION 2: MutationObserver for INSTANT Reaction
// This watches the DOM for changes and kills ads the millisecond they appear.
window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        const video = document.querySelector('video');

        // 1. Check for Ad Containers / State
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');

        if (adShowing || skipBtn) {
            console.log('[Preload] Ad Detected!');

            // A. MUTE INSTANTLY
            if (video && !video.muted) {
                video.muted = true;
                console.log('[Preload] Muted Ad Audio');
            }

            // B. SPEED UP (Fast Forward)
            if (video && !isNaN(video.duration) && video.duration > 0) {
                video.currentTime = video.duration;
                video.playbackRate = 16; // Max speed
                console.log('[Preload] Fast-forwarded Ad');
            }

            // C. CLICK SKIP
            if (skipBtn) {
                skipBtn.click();
                console.log('[Preload] Clicked Skip');
            }

            // D. NUKE OVERLAYS via JS (Backup to CSS)
            const overlays = document.querySelectorAll('.ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay');
            overlays.forEach(el => el.remove());
        } else {
            // Restore audio if ad is gone (and we muted it)
            // Note: Be careful not to unmute if user wanted it muted. 
            // Better strategy: Only mute if it WAS playing. 
            // For now, let's assume if ad is gone, we can unmute if volume was 0? 
            // Actually, safer to let user unmute or tracking script handle it.
            // But usually, video.muted persists. Let's try to unmute if we are sure it's content.
            if (video && video.muted && video.duration > 30) { // Content usually > 30s
                // video.muted = false; // Risky if user muted. Let's leave it for now.
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'src'] // Watch for class changes (ad-showing)
    });

    console.log('[Preload] Ad MutationObserver Attached');
});

function injectVkPlayer() {
    console.log('[Preload] Attempting to inject VK Player...');
    if (document.getElementById('spice-vk-player')) {
        console.log('[Preload] VK Player already exists in DOM! Aborting.');
        return;
    }

    // Wait for YT Music's player bar to be in the DOM before injecting
    let retries = 0;
    const maxRetries = 60; // 30 seconds max wait

    function waitForPlayerBar() {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar) {
            console.log('[Preload] YT Music player bar found, injecting VK Player...');
            buildVkPlayer();
        } else if (retries < maxRetries) {
            retries++;
            setTimeout(waitForPlayerBar, 500);
        } else {
            console.warn('[Preload] YT Music player bar not found after 30s, injecting anyway...');
            buildVkPlayer();
        }
    }

    waitForPlayerBar();
}

function buildVkPlayer() {
    // VK player UI lives in the Electron app frame (index.html), not here.
    // No CSS/DOM injection into YouTube Music.
    console.log('[Preload] VK Player mode active (UI is in app frame, not injected here)');
}


ipcRenderer.on('vk-player-config', (event, enabled) => {
    console.log('[Preload] Received vk-player-config IPC event. Enabled status:', enabled);
    if (enabled) {
        console.log('[Preload] VK Player is enabled. Checking document readyState:', document.readyState);
        // Run now if DOM ready, otherwise wait for it
        if (document.readyState === 'loading') {
            console.log('[Preload] Document is loading. Attaching DOMContentLoaded listener.');
            document.addEventListener('DOMContentLoaded', injectVkPlayer);
        } else {
            console.log('[Preload] Document readyState is ' + document.readyState + '. Injecting immediately.');
            injectVkPlayer();
        }
    }
});

// IPC handler to fetch Innertube keys from the actual renderer environment
ipcRenderer.on('get-yt-keys', () => {
    console.log('[Preload] Main process requested ytcfg keys');

    // Attempt 1: Window object
    if (window.ytcfg && window.ytcfg.get) {
        const apiKey = window.ytcfg.get('INNERTUBE_API_KEY');
        const context = window.ytcfg.get('INNERTUBE_CONTEXT');
        if (apiKey && context) {
            ipcRenderer.send('yt-keys-reply', { apiKey, context });
            return;
        }
    }

    // Attempt 2: Local Storage or raw script tags
    try {
        const html = document.documentElement.innerHTML;
        let apiKey = null;
        let context = null;

        const keyMatch = html.match(/"?INNERTUBE_API_KEY"?\s*:\s*"([^"]+)"/);
        if (keyMatch) apiKey = keyMatch[1];

        const ctxMatch = html.match(/"?INNERTUBE_CONTEXT"?\s*:\s*({.+?})(?:,"|\}$)/m);
        if (ctxMatch) context = JSON.parse(ctxMatch[1]);

        ipcRenderer.send('yt-keys-reply', { apiKey, context });
    } catch (e) {
        ipcRenderer.send('yt-keys-reply', { apiKey: null, context: null });
    }
});

// Steal API credentials directly from YouTube Music's fetch requests
const interceptScript = document.createElement('script');
interceptScript.textContent = getTrustedScript(`
        (function () {
            const originalFetch = window.fetch;
            window.fetch = async function () {
                const url = arguments[0];
                const opts = arguments[1];

                if (typeof url === 'string' && url.includes('youtubei/v1')) {
                    try {
                        const urlObj = new URL(url.startsWith('http') ? url : window.location.origin + url);
                        const key = urlObj.searchParams.get('key');
                        if (key) {
                            window.postMessage({ type: 'SPICE_API_KEY', key: key }, '*');
                        }

                        if (opts && opts.body && typeof opts.body === 'string') {
                            const bodyData = JSON.parse(opts.body);
                            if (bodyData.context) {
                                window.postMessage({ type: 'SPICE_API_CONTEXT', context: bodyData.context }, '*');
                            }
                        }
                    } catch (e) { }
                }
                return originalFetch.apply(this, arguments);
            };

            const originalXhrOpen = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function () {
                const url = arguments[1];
                if (typeof url === 'string' && url.includes('youtubei/v1')) {
                    try {
                        const urlObj = new URL(url.startsWith('http') ? url : window.location.origin + url);
                        const key = urlObj.searchParams.get('key');
                        if (key) {
                            window.postMessage({ type: 'SPICE_API_KEY', key: key }, '*');
                        }
                    } catch (e) { }
                }
                return originalXhrOpen.apply(this, arguments);
            };

    const originalXhrSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function (body) {
        if (typeof body === 'string') {
            try {
                const bodyData = JSON.parse(body);
                if (bodyData.context) {
                    window.postMessage({ type: 'SPICE_API_CONTEXT', context: bodyData.context }, '*');
                }
            } catch (e) { }
        }
        return originalXhrSend.apply(this, arguments);
    };
})();
`);

// SAFEST INJECTION METHOD: Append to whatever is available, or use window/document events.
// Because preload scripts run BEFORE the DOM is constructed, document.head or document.documentElement might be null.
function injectScript() {
    try {
        const parent = document.head || document.documentElement || document.body;
        if (parent) {
            parent.appendChild(interceptScript);
        } else {
            // Ultimate fallback
            setTimeout(injectScript, 10);
        }
    } catch (e) {
        console.error('[Preload] Failed to inject interceptScript:', e);
    }
}

injectScript();

// Listen for the stolen credentials and send them to the main process
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || !event.data.type) return;

    if (event.data.type === 'SPICE_API_KEY') {
        ipcRenderer.send('yt-api-key-intercepted', event.data.key);
    } else if (event.data.type === 'SPICE_API_CONTEXT') {
        ipcRenderer.send('yt-api-context-intercepted', event.data.context);
    }
});
