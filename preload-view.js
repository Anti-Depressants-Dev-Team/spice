/**
 * Preload script for BrowserView
 * Exposes a global function for track detection scripts to report what's playing
 */

const { ipcRenderer, webFrame } = require('electron');

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
