const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("desktop downloads prepare the local media runtime on demand", () => {
  const main = read("main.js");
  const preload = read("preload-view.js");
  const spiceApp = read("apps/backend/app/spice-app.tsx");

  assert.match(
    main,
    /ipcMain\.handle\("spice-runtime-prepare", async \(\) => \{\s*return ensureLocalRuntimeReady\(\);/,
  );
  assert.match(preload, /prepare: \(\) => ipcRenderer\.invoke\('spice-runtime-prepare'\)/);
  assert.match(preload, /Object\.defineProperty\(window, 'spiceDesktopRuntime'/);
  assert.match(
    spiceApp,
    /SPICE_RUNTIME_TARGET === 'vercel' && runtimeBridge[\s\S]*await runtimeBridge\.prepare\(\)[\s\S]*fetch\(trackEndpoint\)/,
  );
});

test("desktop downloads replace browser network failures with actionable messages", () => {
  const spiceApp = read("apps/backend/app/spice-app.tsx");

  assert.match(spiceApp, /The SPICE local media runtime is not reachable/);
  assert.match(spiceApp, /The local MP3 converter could not be reached/);
  assert.match(spiceApp, /The MP3 conversion stopped before the download finished/);
});
