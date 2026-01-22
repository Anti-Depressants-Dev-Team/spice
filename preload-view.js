/**
 * Preload script for BrowserView
 * Exposes a global function for track detection scripts to report what's playing
 */

const { ipcRenderer } = require('electron');

// Expose a global function that injected scripts can call
window.spiceReportTrack = function (track) {
    console.log('[BrowserView Preload] Track reported:', track.track);
    ipcRenderer.send('scrobble-now-playing', track);
};

console.log('[BrowserView Preload] Loaded - spiceReportTrack available');
