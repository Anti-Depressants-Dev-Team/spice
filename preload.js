const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  loadService: (service) => ipcRenderer.send("load-service", service),
  navigate: (action) => ipcRenderer.send("navigate", action),
  openSettings: () => ipcRenderer.send("open-settings"),
  setVolume: (value) => ipcRenderer.send("set-volume", value),
  loadUrl: (url) => ipcRenderer.send("load-url", url),
  hideView: () => ipcRenderer.send("hide-view"),
  showView: () => ipcRenderer.send("show-view"),
  toggleVolume: () => ipcRenderer.send("toggle-volume"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setAdBlocker: (enabled) => ipcRenderer.send("set-adblocker", enabled),
  setVkPlayer: (enabled) => ipcRenderer.send("set-vk-player", enabled),
  setDefaultService: (service) =>
    ipcRenderer.send("set-default-service", service),
  getVolume: () => ipcRenderer.invoke("get-volume"),
  setDiscordRpc: (enabled) => ipcRenderer.send("set-discord-rpc", enabled),
  openLyrics: () => ipcRenderer.send("open-lyrics"),
  openMiniPlayer: () => ipcRenderer.send("open-mini-player"),
  openQueue: () => ipcRenderer.send("open-queue"),
  openDevTools: () => ipcRenderer.send("open-devtools"),
  getNowPlaying: () => ipcRenderer.invoke("get-now-playing"),
  fetchLyrics: (data) => ipcRenderer.invoke("fetch-lyrics", data),
  getTopBarSearch: () => ipcRenderer.invoke("get-topbar-search"),
  setTopBarSearch: (enabled) => ipcRenderer.send("set-topbar-search", enabled),
  executeSearch: (query) => ipcRenderer.send("execute-search", query),
  onTopBarSearchVisibility: (callback) =>
    ipcRenderer.on("topbar-search-visibility", (event, visible) =>
      callback(visible),
    ),
  onLyricsTrackUpdate: (callback) =>
    ipcRenderer.on("lyrics-track-update", (event, track) => callback(track)),
  onLyricsProgressUpdate: (callback) =>
    ipcRenderer.on("lyrics-progress-update", (event, progress) =>
      callback(progress),
    ),
  onQueueUpdate: (callback) =>
    ipcRenderer.on("queue-update", (event, queue) => callback(queue)),
  playQueueIndex: (index) => ipcRenderer.send("play-queue-index", index),
  onServiceActive: (callback) =>
    ipcRenderer.on("service-active", (event, value) => callback(value)),
  onVolumeChanged: (callback) =>
    ipcRenderer.on("volume-changed", (event, value) => callback(value)),
  onVkPlayerVisibility: (callback) =>
    ipcRenderer.on("vk-player-visibility", (event, visible) =>
      callback(visible),
    ),
  onVkTrackUpdate: (callback) =>
    ipcRenderer.on("vk-track-update", (event, info) => callback(info)),
  vkCommand: (cmd) => ipcRenderer.send("vk-player-command", cmd),
  windowControls: {
    minimize: () => {
      console.log("Renderer (preload): window-minimize sent");
      ipcRenderer.send("window-minimize");
    },
    maximize: () => {
      console.log("Renderer (preload): window-maximize sent");
      ipcRenderer.send("window-maximize");
    },
    close: () => {
      console.log("Renderer (preload): window-close sent");
      ipcRenderer.send("window-close");
    },
  },
  // Scrobbler API
  scrobbler: {
    getSettings: () => ipcRenderer.invoke("get-scrobble-settings"),
    saveLastFmCredentials: (apiKey, secret) =>
      ipcRenderer.send("save-lastfm-credentials", { apiKey, secret }),
    saveListenBrainzToken: (token) =>
      ipcRenderer.send("save-listenbrainz-token", token),
    toggleLastFm: (enabled) => ipcRenderer.send("toggle-lastfm", enabled),
    toggleListenBrainz: (enabled) =>
      ipcRenderer.send("toggle-listenbrainz", enabled),
    lastFmAuthenticate: () => ipcRenderer.invoke("lastfm-authenticate"),
    lastFmCompleteAuth: () => ipcRenderer.invoke("lastfm-complete-auth"),
    lastFmApiWizard: () => ipcRenderer.invoke("lastfm-api-wizard"),
    disconnectLastFm: () => ipcRenderer.send("disconnect-lastfm"),
    disconnectListenBrainz: () => ipcRenderer.send("disconnect-listenbrainz"),
    onListenBrainzValidation: (callback) =>
      ipcRenderer.on("listenbrainz-validation", (event, result) =>
        callback(result),
      ),
  },
});

// Listen for track info from injected scripts and forward to main process
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SPICE_NOW_PLAYING") {
    ipcRenderer.send("scrobble-now-playing", event.data.track);
  }
});
