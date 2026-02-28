const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false
        }
    });

    win.webContents.openDevTools();
    win.loadURL('https://music.youtube.com');

    win.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            win.webContents.executeJavaScript(`
            (function() {
                // Find anything containing "ytcfg" or "INNERTUBE"
                const html = document.documentElement.innerHTML;
                const apiMatch = html.match(/.{0,20}INNERTUBE_API_KEY.{0,50}/g);
                const ctxMatch = html.match(/.{0,20}INNERTUBE_CONTEXT.{0,50}/g);
                console.log("=== API KEY MATCHES ===");
                console.log(apiMatch);
                console.log("=== CONTEXT MATCHES ===");
                console.log(ctxMatch);
                
                // Find window global variables
                console.log("=== WINDOW yt* ===");
                const ytKeys = Object.keys(window).filter(k => k.startsWith('yt'));
                console.log(ytKeys);
                
                return { apiMatch, ctxMatch, ytKeys };
            })()
        `).then(res => {
                require('fs').writeFileSync('ytm_debug_output.json', JSON.stringify(res, null, 2));
                console.log("Wrote to ytm_debug_output.json");
                setTimeout(() => app.quit(), 500);
            });
        }, 5000);
    });
});
