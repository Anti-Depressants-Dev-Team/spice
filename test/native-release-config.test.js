const assert = require("node:assert/strict");
const test = require("node:test");

const nativeConfig = require("../electron-builder.native.cjs");

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
