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

test('SPICE Music no longer duplicates the Electron always-on-top control', () => {
  const spiceApp = read('apps/backend/app/spice-app.tsx');
  const viewPreload = read('preload-view.js');

  assert.doesNotMatch(spiceApp, /spiceDesktopWindow|alwaysOnTop|Always on top/);
  assert.doesNotMatch(viewPreload, /spiceDesktopWindow|get-always-on-top|set-always-on-top/);
  assert.match(spiceApp, /action: 'back' \| 'settings'/);
});

test('desktop updater status reaches the settings window', () => {
  const main = read('main.js');

  assert.match(main, /function broadcastUpdateStatus\(payload\)/);
  assert.match(main, /for \(const target of \[mainWindow, settingsWindow\]\)/);
  for (const status of ['checking', 'available', 'not-available', 'error', 'downloading', 'downloaded']) {
    assert.match(main, new RegExp(`broadcastUpdateStatus\\(\\{ status: ["']${status}["']`));
  }
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
