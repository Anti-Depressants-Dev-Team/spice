const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    loadService: (service) => ipcRenderer.send('load-service', service),
    navigate: (action) => ipcRenderer.send('navigate', action),
    openSettings: () => ipcRenderer.send('open-settings'),
    setVolume: (value) => ipcRenderer.send('set-volume', value),
    toggleVolume: () => ipcRenderer.send('toggle-volume'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setAdBlocker: (enabled) => ipcRenderer.send('set-adblocker', enabled),
    setDefaultService: (service) => ipcRenderer.send('set-default-service', service),
    onServiceActive: (callback) => ipcRenderer.on('service-active', (event, value) => callback(value)),
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    }
});
