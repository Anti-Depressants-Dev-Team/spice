import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLocalLinuxUpdateManifest,
  buildLocalWindowsUpdateManifest,
  compareVersions,
  localLinuxDownloadUrl,
  localUpdateManifestUrl,
  localWindowsDownloadUrl,
  newestRuntimeVersion,
} from '../lib/local-updates.ts';

test('compareVersions compares dotted release versions', () => {
  assert.equal(compareVersions('1.0.91', '1.0.90'), 1);
  assert.equal(compareVersions('v1.0.90', '1.0.90'), 0);
  assert.equal(compareVersions('1.0.9', '1.0.90'), -1);
});

test('localUpdateManifestUrl defaults to the cloud update route', () => {
  const originalManifest = process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL;
  const originalCloud = process.env.SPICE_CLOUD_API_ORIGIN;
  delete process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL;
  process.env.SPICE_CLOUD_API_ORIGIN = 'https://music.spice-app.xyz/';

  assert.equal(localUpdateManifestUrl(), 'https://music.spice-app.xyz/api/updates/local-windows');

  if (originalManifest === undefined) delete process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL;
  else process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL = originalManifest;
  if (originalCloud === undefined) delete process.env.SPICE_CLOUD_API_ORIGIN;
  else process.env.SPICE_CLOUD_API_ORIGIN = originalCloud;
});

test('localWindowsDownloadUrl falls back to the unified runtime release', () => {
  const originalUrl = process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL;
  delete process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL;

  assert.equal(
    localWindowsDownloadUrl(),
    'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip',
  );

  restoreEnv('SPICE_LOCAL_WINDOWS_DOWNLOAD_URL', originalUrl);
});

test('localWindowsDownloadUrl rejects non-http configured URLs', () => {
  const originalUrl = process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL;
  process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL = 'ttps://github.com/example/broken.zip';

  assert.equal(
    localWindowsDownloadUrl(),
    'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip',
  );

  restoreEnv('SPICE_LOCAL_WINDOWS_DOWNLOAD_URL', originalUrl);
});

test('local runtime downloads reject the retired legacy repository override', () => {
  const originalWindowsUrl = process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL;
  const originalLinuxUrl = process.env.SPICE_LOCAL_LINUX_DOWNLOAD_URL;
  process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL = 'https://github.com/Anti-Depressants-Dev-Team/SPICE-but-its-crazier-cuz-yes-/releases/latest/download/spice-local-windows.zip';
  process.env.SPICE_LOCAL_LINUX_DOWNLOAD_URL = 'https://github.com/Anti-Depressants-Dev-Team/SPICE-but-its-crazier-cuz-yes-/releases/latest/download/spice-local-linux.zip';

  assert.equal(
    localWindowsDownloadUrl(),
    'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip',
  );
  assert.equal(
    localLinuxDownloadUrl(),
    'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-linux.zip',
  );

  restoreEnv('SPICE_LOCAL_WINDOWS_DOWNLOAD_URL', originalWindowsUrl);
  restoreEnv('SPICE_LOCAL_LINUX_DOWNLOAD_URL', originalLinuxUrl);
});

test('a stale configured manifest version cannot hide a newer bundled runtime', () => {
  assert.equal(newestRuntimeVersion('1.0.129', '1.0.130'), '1.0.130');
  assert.equal(newestRuntimeVersion('1.0.131', '1.0.130'), '1.0.131');
});

test('local Linux updates use a separate public artifact and manifest route', () => {
  const originalUrl = process.env.SPICE_LOCAL_LINUX_DOWNLOAD_URL;
  const originalManifest = process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL;
  delete process.env.SPICE_LOCAL_LINUX_DOWNLOAD_URL;
  delete process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL;

  assert.equal(
    localLinuxDownloadUrl(),
    'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-linux.zip',
  );
  assert.equal(
    localUpdateManifestUrl('https://music.spice-app.xyz', 'linux'),
    'https://music.spice-app.xyz/api/updates/local-linux',
  );
  assert.equal(buildLocalLinuxUpdateManifest().platform, 'linux');

  restoreEnv('SPICE_LOCAL_LINUX_DOWNLOAD_URL', originalUrl);
  restoreEnv('SPICE_LOCAL_UPDATE_MANIFEST_URL', originalManifest);
});

test('buildLocalWindowsUpdateManifest uses configured artifact metadata without requiring a database', () => {
  const originalUrl = process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL;
  const originalHash = process.env.SPICE_LOCAL_WINDOWS_SHA256;
  const originalSize = process.env.SPICE_LOCAL_WINDOWS_SIZE_BYTES;
  const originalVersion = process.env.SPICE_LOCAL_WINDOWS_VERSION;
  const originalInstallOrigin = process.env.SPICE_INSTALL_ORIGIN;
  const originalReleaseNotes = process.env.SPICE_LOCAL_WINDOWS_RELEASE_NOTES_URL;

  process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL = 'https://downloads.spice-app.xyz/spice-local-windows.zip';
  process.env.SPICE_LOCAL_WINDOWS_SHA256 = 'abc123';
  process.env.SPICE_LOCAL_WINDOWS_SIZE_BYTES = '42';
  process.env.SPICE_LOCAL_WINDOWS_VERSION = '1.0.138';
  delete process.env.SPICE_INSTALL_ORIGIN;
  delete process.env.SPICE_LOCAL_WINDOWS_RELEASE_NOTES_URL;

  const manifest = buildLocalWindowsUpdateManifest();
  assert.equal(manifest.version, '1.0.138');
  assert.equal(manifest.download?.url, 'https://downloads.spice-app.xyz/spice-local-windows.zip');
  assert.equal(manifest.download?.sha256, 'abc123');
  assert.equal(manifest.download?.sizeBytes, 42);
  assert.equal(manifest.releaseNotesUrl, 'https://install.spice-app.xyz/');

  restoreEnv('SPICE_LOCAL_WINDOWS_DOWNLOAD_URL', originalUrl);
  restoreEnv('SPICE_LOCAL_WINDOWS_SHA256', originalHash);
  restoreEnv('SPICE_LOCAL_WINDOWS_SIZE_BYTES', originalSize);
  restoreEnv('SPICE_LOCAL_WINDOWS_VERSION', originalVersion);
  restoreEnv('SPICE_INSTALL_ORIGIN', originalInstallOrigin);
  restoreEnv('SPICE_LOCAL_WINDOWS_RELEASE_NOTES_URL', originalReleaseNotes);
});

function restoreEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
