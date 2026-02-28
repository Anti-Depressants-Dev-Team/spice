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
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
        z-index: -9999 !important;
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

    // 1. Inject VK styles & Hide native player
    const style = document.createElement('style');
    style.textContent = getTrustedHTML(`
        /* Hide native player but keep it functional for sync */
        ytmusic-app-layout[player-visible_] > [slot=player-bar] {
            position: absolute !important;
            left: -99999px !important;
            visibility: hidden !important;
        }

        /* Push content down to fit topbar */
        #nav-bar-background { top: 50px !important; }
        ytmusic-app-layout > [slot=header] { top: 50px !important; }
        ytmusic-browse-response { margin-top: 50px !important; }

        #spice-vk-player {
            position: fixed; top: 0; left: 0; right: 0; height: 50px;
            background: #222222; border-bottom: 1px solid #333333; z-index: 999999;
            display: flex; align-items: center; padding: 0 16px; gap: 6px;
            color: #e1e3e6; font-family: Roboto, Arial, sans-serif;
        }

        .svc-ctrl-btn {
            width: 32px; height: 32px; border-radius: 50%; background: transparent;
            color: #939699; font-size: 18px; cursor: pointer; border: none;
            display: flex; align-items: center; justify-content: center; transition: 0.15s;
        }
        .svc-ctrl-btn:hover { background: rgba(255,255,255,0.08); color: #e1e3e6; }
        .svc-ctrl-btn svg { width: 18px; height: 18px; fill: currentColor; }

        .svc-play-btn {
            width: 36px; height: 36px; border-radius: 50%; background: #a855f7; color: #fff;
            font-size: 18px; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center;
        }
        .svc-play-btn:hover { background: #c084fc; }

        .svc-track-info { display: flex; align-items: center; gap: 10px; margin-left: 8px; max-width: 250px; overflow: hidden; }
        .svc-track-art { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; background: #333; }
        .svc-track-text { overflow: hidden; white-space: nowrap; }
        .svc-track-title { font-size: 13px; color: #e1e3e6; overflow: hidden; text-overflow: ellipsis; font-weight: 500;}
        .svc-track-artist { font-size: 12px; color: #939699; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;}

        .svc-progress-wrap { display: flex; align-items: center; gap: 8px; flex: 1; margin: 0 16px; }
        .svc-time { font-size: 11px; color: #656565; min-width: 35px; }
        .svc-progress-bg { flex: 1; height: 4px; background: #333; border-radius: 2px; cursor: pointer; position: relative; }
        .svc-progress-fill { height: 100%; background: #a855f7; border-radius: 2px; width: 0%; pointer-events: none; }

        .svc-vol-wrap { display: flex; align-items: center; gap: 4px; }
        .svc-vol-slider { width: 80px; height: 4px; cursor: pointer; accent-color: #a855f7; }
    `);
    document.head.appendChild(style);

    // 2. Build Topbar DOM
    const playerHtml = `
        <div id="spice-vk-player">
            <button class="svc-ctrl-btn" id="svc-btn-prev"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
            <button class="svc-play-btn" id="svc-btn-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
            <button class="svc-ctrl-btn" id="svc-btn-next"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
            <button class="svc-ctrl-btn" id="svc-btn-shuffle"><svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
            
            <div class="svc-track-info">
                <img class="svc-track-art" id="svc-track-art" src="">
                <div class="svc-track-text">
                    <div class="svc-track-title" id="svc-track-title">No track playing</div>
                    <div class="svc-track-artist" id="svc-track-artist">Select a song</div>
                </div>
            </div>

            <div class="svc-progress-wrap">
                <span class="svc-time" id="svc-time-current">0:00</span>
                <div class="svc-progress-bg" id="svc-progress-bar"><div class="svc-progress-fill" id="svc-progress-fill"></div></div>
                <span class="svc-time" id="svc-time-total">0:00</span>
            </div>

            <div class="svc-vol-wrap">
                <button class="svc-ctrl-btn">
                    <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
                <input type="range" class="svc-vol-slider" id="svc-vol-slider" min="0" max="100" value="100">
            </div>
        </div>
    `;

    let safeHtml = playerHtml;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            const domPolicy = window.trustedTypes.createPolicy('spice-dom-policy', {
                createHTML: (string) => string
            });
            safeHtml = domPolicy.createHTML(playerHtml);
        } catch (e) {
            // ignore
        }
    }

    // Inject at the very end of body so it doesn't interrupt Polymer React roots
    document.body.insertAdjacentHTML('beforeend', safeHtml);
    console.log('[Preload] Injected VK Topbar Player UI');

    // 3. Bind Controls to YT Music Node Graph
    const getEl = (selector) => document.querySelector(selector);

    // Buttons
    getEl('#svc-btn-play').addEventListener('click', () => {
        const btn = getEl('#play-pause-button');
        if (btn) btn.click();
    });

    getEl('#svc-btn-prev').addEventListener('click', () => {
        const btn = getEl('.previous-button');
        if (btn) btn.click();
    });

    getEl('#svc-btn-next').addEventListener('click', () => {
        const btn = getEl('.next-button');
        if (btn) btn.click();
    });

    getEl('#svc-btn-shuffle').addEventListener('click', () => {
        // Toggle shuffle
        const btn = getEl('ytmusic-player-bar tp-yt-paper-icon-button.shuffle');
        if (btn) btn.click();
    });

    // Volume
    const volSlider = getEl('#svc-vol-slider');
    volSlider.addEventListener('input', (e) => {
        const video = getEl('video');
        if (video) video.volume = e.target.value / 100;
    });

    // Setup Sync Loop to poll player state
    setInterval(() => {
        const video = getEl('video');
        if (!video) return;

        // Play/Pause icon sync
        const playBtn = getEl('#svc-btn-play');
        if (playBtn) {
            const playSvg = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
            const pauseSvg = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            playBtn.innerHTML = getTrustedHTML(video.paused ? playSvg : pauseSvg);
        }

        // Track info sync
        const titleEl = getEl('ytmusic-player-bar yt-formatted-string.title');
        const artistEl = getEl('ytmusic-player-bar span.subtitle');
        const artEl = getEl('ytmusic-player-bar img#img');

        if (titleEl) getEl('#svc-track-title').textContent = titleEl.textContent;
        if (artistEl) getEl('#svc-track-artist').textContent = artistEl.textContent;
        if (artEl && artEl.src) getEl('#svc-track-art').src = artEl.src;

        // Time sync
        const timeInfo = getEl('ytmusic-player-bar .time-info');
        if (timeInfo) {
            const parts = timeInfo.textContent.split('/');
            if (parts.length === 2) {
                getEl('#svc-time-current').textContent = parts[0].trim();
                getEl('#svc-time-total').textContent = parts[1].trim();
            }
        }

        // Progress bar sync
        if (video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            const fill = getEl('#svc-progress-fill');
            if (fill) fill.style.width = pct + '%';
        }
    }, 500);
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
document.documentElement.appendChild(interceptScript);

// Listen for the stolen credentials and send them to the main process
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || !event.data.type) return;

    if (event.data.type === 'SPICE_API_KEY') {
        ipcRenderer.send('yt-api-key-intercepted', event.data.key);
    } else if (event.data.type === 'SPICE_API_CONTEXT') {
        ipcRenderer.send('yt-api-context-intercepted', event.data.context);
    }
});
