const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    loadService: (service) => ipcRenderer.send('load-service', service),
    navigate: (action) => ipcRenderer.send('navigate', action),
    openSettings: () => ipcRenderer.send('open-settings'),
    setVolume: (value) => ipcRenderer.send('set-volume', value),
    loadUrl: (url) => ipcRenderer.send('load-url', url),
    hideView: () => ipcRenderer.send('hide-view'),
    showView: () => ipcRenderer.send('show-view'),
    toggleVolume: () => ipcRenderer.send('toggle-volume'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setAdBlocker: (enabled) => ipcRenderer.send('set-adblocker', enabled),
    setDefaultService: (service) => ipcRenderer.send('set-default-service', service),
    setDiscordRpc: (enabled) => ipcRenderer.send('set-discord-rpc', enabled),
    onServiceActive: (callback) => ipcRenderer.on('service-active', (event, value) => callback(value)),
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    },
    // Scrobbler API
    scrobbler: {
        getSettings: () => ipcRenderer.invoke('get-scrobble-settings'),
        saveLastFmCredentials: (apiKey, secret) => ipcRenderer.send('save-lastfm-credentials', { apiKey, secret }),
        saveListenBrainzToken: (token) => ipcRenderer.send('save-listenbrainz-token', token),
        toggleLastFm: (enabled) => ipcRenderer.send('toggle-lastfm', enabled),
        toggleListenBrainz: (enabled) => ipcRenderer.send('toggle-listenbrainz', enabled),
        lastFmAuthenticate: () => ipcRenderer.invoke('lastfm-authenticate'),
        lastFmCompleteAuth: () => ipcRenderer.invoke('lastfm-complete-auth'),
        lastFmApiWizard: () => ipcRenderer.invoke('lastfm-api-wizard'),
        disconnectLastFm: () => ipcRenderer.send('disconnect-lastfm'),
        disconnectListenBrainz: () => ipcRenderer.send('disconnect-listenbrainz'),
        onListenBrainzValidation: (callback) => ipcRenderer.on('listenbrainz-validation', (event, result) => callback(result))
    }
});

// Listen for track info from injected scripts and forward to main process
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SPICE_NOW_PLAYING') {
        ipcRenderer.send('scrobble-now-playing', event.data.track);
    }
});
