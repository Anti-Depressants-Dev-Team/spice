const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function executeThemeFunction(source, functionName, themes) {
  const properties = new Map();
  const documentElement = {
    dataset: {},
    style: {
      removeProperty: (name) => properties.delete(name),
      setProperty: (name, value) => properties.set(name, value),
    },
  };
  const context = vm.createContext({ document: { documentElement } });
  vm.runInContext(extractFunction(source, functionName), context);
  for (const theme of themes) vm.runInContext(`${functionName}(${JSON.stringify(theme)})`, context);
  return { documentElement, properties };
}

test('desktop-only settings stay in the Electron settings window', () => {
  const settings = read('settings.html');

  for (const controlId of [
    'adblock-type',
    'default-service',
    'discord-toggle',
    'vk-player-toggle',
    'topbar-search-toggle',
    'always-on-top-toggle',
    'open-toolbar-settings-btn',
    'custom-css',
    'check-updates-btn',
    'open-devtools-btn',
  ]) {
    assert.match(settings, new RegExp(`id=["']${controlId}["']`));
  }

  assert.match(settings, /id="open-spice-settings-btn"/);
  assert.match(settings, /Desktop Scrobbling/);
  assert.match(settings, /YouTube Music and SoundCloud/);
});

test('Native desktop settings move into SPICE Music while the wrapper keeps its window', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');
  const viewPreload = read('preload-view.js');
  const main = read('main.js');
  const settings = read('settings.html');

  assert.match(spiceApp, /nativeShellAvailable/);
  assert.match(spiceApp, /SPICE Native Desktop/);
  assert.match(spiceApp, /Discord Rich Presence/);
  assert.match(spiceApp, /Always on Top/);
  assert.match(spiceApp, /if \(!active \|\| !settings\.nativeMode\) return/);
  assert.match(viewPreload, /if \(!IS_SPICE_LOCAL_RUNTIME \|\| window\.spiceNativeShell\) return/);
  assert.match(viewPreload, /Object\.defineProperty\(window, 'spiceNativeShell'/);
  assert.match(main, /if \(!APP_NATIVE_MODE\) \{\s*createSettingsWindow\(\)/s);
  assert.match(main, /openSpiceSettingsInMainWindow\(\)\.catch/);
  assert.match(settings, /id="discord-toggle"/);
  assert.match(spiceApp, /action: 'back' \| 'settings'/);
});

test('Native shell removes the wrapper settings gear from its title bar', () => {
  const index = read('index.html');

  assert.match(index, /\$\{!nativeMode\s*&&\s*html`<button class="nav-btn" onClick=\$\{function\(\) \{ callApi\('openSettings'\); \}\}/s);
});

test('desktop updater status reaches the settings window', () => {
  const main = read('main.js');

  assert.match(main, /function broadcastUpdateStatus\(payload\)/);
  assert.match(main, /for \(const target of \[mainWindow, settingsWindow\]\)/);
  assert.match(main, /view\.webContents\.send\("update-status", payload\)/);
  for (const status of ['checking', 'available', 'not-available', 'error', 'downloading', 'downloaded']) {
    assert.match(main, new RegExp(`broadcastUpdateStatus\\(\\{ status: ["']${status}["']`));
  }
});

test('collapsed SPICE sidebar remains an interactive icon rail', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');
  const styles = read('apps/backend/app/globals.css');

  assert.match(styles, /\.app\.app--sidebar-hidden\s*\{[^}]*grid-template-columns:\s*var\(--sidebar-collapsed\) 1fr/s);
  assert.match(styles, /\.sidebar\.sidebar--hidden\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(styles, /\.app--sidebar-hidden \.sidebar__nav-label[\s\S]*display:\s*none/);
  assert.match(spiceApp, /aria-label=\{sidebarHidden \? 'Collapsed sidebar' : 'Sidebar'\}/);
  assert.match(spiceApp, /sidebarHidden \? Icons\.chevronRight : Icons\.chevronLeft/);
  assert.doesNotMatch(spiceApp, /className="sidebar-restore-btn"/);
});

test('SPICE topbar search dismisses on an outside pointer press', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');

  assert.match(spiceApp, /const topbarSearchShellRef = useRef/);
  assert.match(spiceApp, /topbarSearchShellRef\.current\?\.contains\(target\)/);
  assert.match(spiceApp, /document\.addEventListener\('pointerdown', dismissTopbarSearch\)/);
  assert.match(spiceApp, /document\.removeEventListener\('pointerdown', dismissTopbarSearch\)/);
  assert.match(spiceApp, /className="app-topbar__search-shell" ref=\{topbarSearchShellRef\}/);
});

test('restart-based desktop settings validate input and skip no-op restarts', () => {
  const main = read('main.js');

  assert.match(main, /DESKTOP_STARTUP_SERVICES\.has\(service\)/);
  assert.match(main, /DESKTOP_AD_BLOCKERS\.has\(value\)/);
  assert.match(main, /store\.get\("vkPlayerEnabled", false\) === next/);
  assert.match(main, /store\.get\("defaultService", DEFAULT_STARTUP_SERVICE\) === service/);
});

test('settings windows apply and clear live custom theme variables', () => {
  const custom = {
    primary: '#12ab34',
    secondary: '#3456cd',
    highlight: '#67ef89',
    background: '#020603',
    surface: '#0a170d',
    glass: 'rgba(2, 6, 3, 0.9)',
    border: 'rgba(18, 171, 52, 0.4)',
    primaryRgb: '18, 171, 52',
  };

  for (const [file, functionName] of [
    ['settings.html', 'applySettingsTheme'],
    ['toolbar-icons.html', 'applyToolbarTheme'],
  ]) {
    const source = read(file);
    const themed = executeThemeFunction(source, functionName, [
      { accent: 'green', surface: 'aurora', custom },
    ]);
    assert.equal(themed.documentElement.dataset.spiceAccent, 'green');
    assert.equal(themed.documentElement.dataset.spiceSurface, 'aurora');
    assert.equal(themed.properties.get('--accent'), custom.primary);
    assert.equal(themed.properties.get('--shell-background'), custom.background);
    assert.equal(themed.properties.get('--shell-surface'), custom.glass);
    assert.equal(themed.properties.get('--card-bg'), custom.surface);
    assert.equal(themed.properties.get('--border-glass'), custom.border);

    const reset = executeThemeFunction(source, functionName, [
      { accent: 'green', surface: 'aurora', custom },
      { accent: 'blue', surface: 'solid' },
    ]);
    assert.equal(reset.documentElement.dataset.spiceAccent, 'blue');
    assert.equal(reset.documentElement.dataset.spiceSurface, 'solid');
    assert.equal(reset.properties.size, 0);
  }
});

test('desktop settings keep one bounded scroller and scope wheel handling to hovered selects', () => {
  const settings = read('settings.html');

  assert.match(settings, /\.settings-layout\s*\{[^}]*min-height:\s*0/s);
  assert.match(settings, /\.settings-content\s*\{[^}]*min-height:\s*0/s);
  assert.match(settings, /document\.querySelectorAll\(['"]select['"]\)/);
  assert.match(settings, /event\.preventDefault\(\)/);
  assert.doesNotMatch(settings, /document\.activeElement\.tagName === ['"]SELECT['"]/);
});

test('desktop settings sidebar locks a requested section through smooth scrolling', () => {
  const settings = read('settings.html');

  assert.match(settings, /let requestedSidebarSection = null/);
  assert.match(settings, /if \(requestedSidebarSection\) \{\s*setActiveSidebarLink\(requestedSidebarSection\)/s);
  assert.match(settings, /scrollContainer\.scrollTop \+ sectionRect\.top - containerRect\.top - 20/);
  assert.match(settings, /link\.setAttribute\('aria-current', 'location'\)/);
  assert.match(settings, /sectionLink\.classList\.toggle\("hidden", isNativeMode\)/);
});

test('SPICE Music settings navigation and topbar command shortcut use live theme tokens', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');
  const styles = read('apps/backend/app/globals.css');

  assert.match(spiceApp, /className="settings-page-nav"/);
  assert.match(spiceApp, /rgba\(var\(--accent-pink-rgb/);
  assert.match(spiceApp, /className="app-topbar__command-palette"/);
  assert.match(spiceApp, /aria-label="Open command palette"/);
  assert.match(styles, /\.app-topbar__command-palette/);
  assert.doesNotMatch(spiceApp, /className="now-playing__btn now-playing__command-palette"/);
  assert.doesNotMatch(spiceApp, /document\.activeElement.*tagName === 'SELECT'/s);
});

test('Native launcher summary cards contain long account and runtime values', () => {
  const launcher = read('index.html');
  const styles = read('styles.css');

  assert.match(launcher, /class="theme-home-bg native-launch"/);
  assert.match(launcher, /native-launch__metric-value--email/);
  assert.match(launcher, /title=\$\{account && account\.user/);
  assert.match(styles, /\.native-launch__metric\s*\{[^}]*min-width:\s*0/s);
  assert.match(styles, /\.native-launch__metric-value\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(styles, /\.native-launch__metrics\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/s);
});

test('desktop updater cleanup cannot quit before electron-updater launches the installer', () => {
  const main = read('main.js');

  assert.match(main, /for \(const targetWindow of BrowserWindow\.getAllWindows\(\)\)/);
  assert.match(main, /if \(updateInstallInProgress\) return;\s*if \(process\.platform !== "darwin"\) app\.quit\(\);/);
  assert.match(main, /await spiceRuntimeManager\.stop\(\)/);
  assert.match(main, /autoUpdater\.quitAndInstall\(false, true\)/);
});

test('single-note branding is used by the player favicon and hosted portal', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');
  const portal = read('apps/backend/app/cloud-portal.tsx');
  const portalStyles = read('apps/backend/app/cloud-portal.module.css');

  assert.match(spiceApp, /<path d="M64 25v55\.2/);
  assert.match(portal, /<path d="M12 3v10\.55/);
  assert.match(portalStyles, /\.logoMark\s*\{[^}]*width:\s*54px/s);
});
