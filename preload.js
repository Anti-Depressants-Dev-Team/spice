const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    loadService: (service) => ipcRenderer.send('load-service', service),
    navigate: (action) => ipcRenderer.send('navigate', action),
    onServiceActive: (callback) => ipcRenderer.on('service-active', (event, value) => callback(value)),
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    }
});
