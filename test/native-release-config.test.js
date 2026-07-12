const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const packageConfig = require("../package.json");
const { build: wrapperConfig } = packageConfig;
const nativeConfig = require("../electron-builder.native.cjs");

const expectedRuntimeFiles = [
  "main.js",
  "preload.js",
  "preload-view.js",
  "discord-rpc.js",
  "scrobbler.js",
  "spice-local-runtime-manager.js",
  "runtime-archive.js",
  "desktop-helpers.js",
  "index.html",
  "settings.html",
  "queue.html",
  "lyrics.html",
  "lyrics.js",
  "lyrics-core.js",
  "toolbar-icons.html",
  "styles.css",
  "icon.png",
  "src/server.js",
  "src/mini-player/**/*",
  "src/obs/**/*",
  "package.json",
];

const uBlockResource = {
  from: "src/extensions/ublock0/uBlock0.chromium",
  to: "extensions/ublock0/uBlock0.chromium",
  filter: ["**/*"],
};

test("wrapper packages only the explicit desktop runtime", () => {
  assert.deepEqual(wrapperConfig.files, expectedRuntimeFiles);
  assert.ok(!wrapperConfig.files.includes("**/*"));
});

test("wrapper and Native releases externalize the complete uBlock extension", () => {
  assert.deepEqual(wrapperConfig.extraResources, [uBlockResource]);
  assert.deepEqual(nativeConfig.extraResources[0], uBlockResource);
  assert.deepEqual(nativeConfig.extraResources.at(-1), {
    from: "native-runtime",
    to: "native-runtime",
    filter: ["**/*"],
  });
});

test("legacy uBlock Lite is retired and migrated to the built-in blocker", () => {
  const root = path.join(__dirname, "..");
  const mainSource = fs.readFileSync(path.join(root, "main.js"), "utf8");
  const settingsSource = fs.readFileSync(path.join(root, "settings.html"), "utf8");

  assert.equal(
    fs.existsSync(path.join(root, "src", "extensions", "ublock_lite.zip")),
    false,
  );
  assert.doesNotMatch(settingsSource, /<option value="ublock_lite"/);
  assert.match(mainSource, /adBlockerType === "ublock_lite"/);
  assert.match(mainSource, /adBlockerType = "spice"/);
  assert.match(mainSource, /app\.isPackaged[\s\S]*process\.resourcesPath/);
});

test("desktop package metadata and backend workspace wrappers stay aligned", () => {
  assert.equal(packageConfig.main, "main.js");
  assert.equal(packageConfig.type, "commonjs");
  assert.equal(packageConfig.license, "MIT");
  assert.deepEqual(packageConfig.workspaces, ["apps/backend"]);
  assert.equal(packageConfig.engines.node, ">=24");
  assert.equal(packageConfig.packageManager, undefined);

  const expectedBackendScripts = {
    "backend:install": "npm install --workspace @spice/backend",
    "backend:dev": "npm --workspace @spice/backend run dev",
    "backend:build": "npm --workspace @spice/backend run build",
    "backend:build:local": "npm --workspace @spice/backend run build:local",
    "backend:build:vercel": "npm --workspace @spice/backend run build:vercel",
    "backend:lint": "npm --workspace @spice/backend run lint",
    "backend:typecheck": "npm --workspace @spice/backend run typecheck",
    "backend:test": "npm --workspace @spice/backend run test",
    "backend:package:local:windows":
      "npm --workspace @spice/backend run package:local:windows",
    "backend:package:local:windows:full":
      "npm --workspace @spice/backend run package:local:windows:full",
    "backend:package:local:linux":
      "npm --workspace @spice/backend run package:local:linux",
    "backend:package:local:linux:full":
      "npm --workspace @spice/backend run package:local:linux:full",
  };

  for (const [name, command] of Object.entries(expectedBackendScripts)) {
    assert.equal(packageConfig.scripts[name], command);
  }
});

test("wrapper Linux releases include a Fedora RPM distinct from Native", () => {
  assert.deepEqual(wrapperConfig.linux.target, ["AppImage", "flatpak", "deb", "rpm", "tar.gz"]);
  assert.equal(wrapperConfig.rpm.packageName, "spice");
  assert.equal(nativeConfig.rpm.packageName, "spice-native");
});

test("native releases use an isolated update channel and cache", () => {
  const publishers = Array.isArray(nativeConfig.publish)
    ? nativeConfig.publish
    : [nativeConfig.publish];

  assert.ok(publishers.length > 0);
  for (const publisher of publishers) {
    assert.equal(publisher.channel, "native");
    assert.equal(publisher.updaterCacheDirName, "spice-native-updater");
  }
  assert.equal(nativeConfig.detectUpdateChannel, false);
  assert.equal(nativeConfig.generateUpdatesFilesForAllChannels, false);
});

test("native installer identity remains separate from the wrapper", () => {
  assert.equal(nativeConfig.appId, "com.spice.native");
  assert.equal(nativeConfig.productName, "Spice Native");
  assert.equal(nativeConfig.executableName, "Spice Native");
  assert.equal(
    nativeConfig.nsis.artifactName,
    "Spice-Native-Setup-${version}-${arch}.${ext}",
  );
  assert.deepEqual(nativeConfig.linux.target, ["AppImage", "deb", "rpm", "tar.gz"]);
  assert.equal(nativeConfig.linux.executableName, "spice-native");
  assert.equal(nativeConfig.linux.synopsis, "SPICE Music with a bundled local runtime");
  assert.match(nativeConfig.linux.description, /media runtime on the user's computer/);
  assert.equal(nativeConfig.deb.packageName, "spice-native");
  assert.equal(nativeConfig.rpm.packageName, "spice-native");
});
