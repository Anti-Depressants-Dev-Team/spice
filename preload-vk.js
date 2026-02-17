const { ipcRenderer } = require('electron');

// Expose VK Music API to the renderer
window.api = {
    // Send a command to the hidden YouTube Music backend
    vkCommand: (cmd, data) => {
        ipcRenderer.send('vk-command', cmd, data);
    },

    // Receive track info updates from backend
    onTrackUpdate: (callback) => {
        ipcRenderer.on('vk-track-update', (event, trackData) => {
            callback(trackData);
        });
    },

    // Receive progress updates from backend
    onProgressUpdate: (callback) => {
        ipcRenderer.on('vk-progress-update', (event, progressData) => {
            callback(progressData);
        });
    },

    // Receive search results or content lists
    onContentUpdate: (callback) => {
        ipcRenderer.on('vk-content-update', (event, contentData) => {
            callback(contentData);
        });
    },

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    openSettings: () => ipcRenderer.send('open-settings'),
    openLyrics: () => ipcRenderer.send('open-lyrics'),
};
