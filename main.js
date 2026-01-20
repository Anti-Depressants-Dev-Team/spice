const { app, BrowserWindow, BrowserView, ipcMain, shell } = require('electron');
const path = require('path');

let store;
let mainWindow;
let view;

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
        // If there was a last service, auto-load it
        if (lastService && SERVICES[lastService]) {
            loadService(lastService);
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

    // Save state
    if (store) store.set('lastService', serviceKey);

    // Create or update BrowserView
    if (!view) {
        view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        mainWindow.setBrowserView(view);
    }

    updateViewBounds();

    view.webContents.loadURL(SERVICES[serviceKey]);

    // Handle external links for the view
    view.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Notify renderer that a service is active (to show top bar)
    mainWindow.webContents.send('service-active', true);
}

function goHome() {
    if (view) {
        mainWindow.setBrowserView(null);
        view.webContents.destroy();
        view = null;
    }
    if (store) store.delete('lastService');
    mainWindow.webContents.send('service-active', false);
}

app.whenReady().then(() => {
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
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});
