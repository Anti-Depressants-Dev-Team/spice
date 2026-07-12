const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compareVersions,
  resolveRuntimeDownloadUrl,
  runtimePlatformConfig,
  shouldInstallRuntimeUpdate,
} = require("../spice-local-runtime-manager");

test("compareVersions orders numeric runtime versions", () => {
  assert.equal(compareVersions("1.0.10", "1.0.9") > 0, true);
  assert.equal(compareVersions("1.0.0", "1.0") === 0, true);
  assert.equal(compareVersions("1.1.0-beta.1", "1.0.99") > 0, true);
});

test("shouldInstallRuntimeUpdate only updates when the manifest is newer or local state is missing", () => {
  assert.equal(shouldInstallRuntimeUpdate(null, "1.0.0"), true);
  assert.equal(shouldInstallRuntimeUpdate("unknown", "1.0.0"), true);
  assert.equal(shouldInstallRuntimeUpdate("1.0.0", "1.0.1"), true);
  assert.equal(shouldInstallRuntimeUpdate("1.0.1", "1.0.1"), false);
  assert.equal(shouldInstallRuntimeUpdate("1.0.2", "1.0.1"), false);
  assert.equal(shouldInstallRuntimeUpdate("1.0.2", null), false);
});

test("resolveRuntimeDownloadUrl keeps runtime downloads on http origins", () => {
  assert.equal(
    resolveRuntimeDownloadUrl(
      "/downloads/spice-local-windows.zip",
      "https://music.spice-app.xyz/api/updates/local-windows",
    ),
    "https://music.spice-app.xyz/downloads/spice-local-windows.zip",
  );
});

test("runtimePlatformConfig selects platform-correct update artifacts", () => {
  assert.deepEqual(runtimePlatformConfig("win32"), {
    id: "windows",
    archiveName: "spice-local-windows.zip",
    manifestUrl: "https://music.spice-app.xyz/api/updates/local-windows",
    downloadUrl: "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip",
  });
  assert.deepEqual(runtimePlatformConfig("linux"), {
    id: "linux",
    archiveName: "spice-local-linux.zip",
    manifestUrl: "https://music.spice-app.xyz/api/updates/local-linux",
    downloadUrl: "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-linux.zip",
  });
  assert.equal(runtimePlatformConfig("darwin"), null);
});
