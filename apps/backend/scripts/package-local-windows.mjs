import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDir = path.join(appRoot, '.next', 'standalone');
const staticDir = path.join(appRoot, '.next', 'static');
const publicDir = path.join(appRoot, 'public');
const distRoot = path.join(appRoot, 'dist');
const packageDir = path.join(distRoot, 'spice-local-windows');
const cloudApiPrefixes = [
  '/api/account',
  '/api/admin',
  '/api/auth',
  '/api/changelog',
  '/api/cloud',
  '/api/feedback',
  '/api/lastfm',
  '/api/listen-together',
  '/api/notifications',
  '/api/playlists',
  '/api/profile',
  '/api/remote',
  '/api/sync',
  '/api/users',
  '/api/version',
];
const forbiddenDbMarkers = [
  /postgres(?:ql)?:\/\//i,
  /@neondatabase/i,
  /drizzle-orm/i,
  /DATABASE_URL/,
  /neon\.tech/i,
];

await assertExists(standaloneDir, 'Run pnpm --filter @spice/backend build:local before packaging.');
await assertExists(staticDir, 'The local Next build did not produce .next/static.');

await rm(packageDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });
await cp(standaloneDir, packageDir, { recursive: true });

if (existsSync(publicDir)) {
  await cp(publicDir, path.join(packageDir, 'public'), { recursive: true });
}
await mkdir(path.join(packageDir, '.next'), { recursive: true });
await cp(staticDir, path.join(packageDir, '.next', 'static'), { recursive: true });

await pruneLocalPackage(packageDir);
await sanitizeNextManifests(packageDir);
await pruneUnreferencedForbiddenChunks(packageDir);
await sanitizeStandaloneMetadata(packageDir);
await writeLaunchers(packageDir);
await scanForForbiddenLocalPayload(packageDir);

console.log(`Packaged SPICE local runtime at ${packageDir}`);

async function assertExists(target, message) {
  if (!existsSync(target)) {
    throw new Error(message);
  }
}

async function pruneLocalPackage(root) {
  const deleteTargets = [
    'apps/backend/app/api/cloud',
    'apps/backend/.next/server/app/api/cloud',
    'apps/backend/.next/server/app/api/account',
    'apps/backend/.next/server/app/api/admin',
    'apps/backend/.next/server/app/api/auth',
    'apps/backend/.next/server/app/api/changelog',
    'apps/backend/.next/server/app/api/feedback',
    'apps/backend/.next/server/app/api/lastfm',
    'apps/backend/.next/server/app/api/listen-together',
    'apps/backend/.next/server/app/api/notifications',
    'apps/backend/.next/server/app/api/playlists',
    'apps/backend/.next/server/app/api/profile',
    'apps/backend/.next/server/app/api/remote',
    'apps/backend/.next/server/app/api/sync',
    'apps/backend/.next/server/app/api/users',
    'apps/backend/.next/server/app/api/version',
    'apps/backend/db',
    'node_modules/@neondatabase',
    'node_modules/drizzle-orm',
  ];

  for (const target of deleteTargets) {
    await rm(path.join(root, target), { recursive: true, force: true });
  }
}

async function sanitizeStandaloneMetadata(root) {
  const backendRoot = path.join(root, 'apps', 'backend');
  const removeTargets = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
  ];

  for (const target of removeTargets) {
    await rm(path.join(backendRoot, target), { force: true });
  }

  const packageJson = {
    name: '@spice/backend-local-runtime',
    private: true,
    type: 'module',
    scripts: {
      start: 'node server.js',
    },
    spice: {
      runtimeTarget: 'local',
      localApiPrefix: '/api/local',
      cloudApiPrefix: '/api/cloud',
      cloudApiOrigin: 'https://music.spice-app.xyz',
    },
  };

  await writeFile(path.join(backendRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

  const serverFile = path.join(backendRoot, 'server.js');
  const serverText = await readFile(serverFile, 'utf8').catch(() => '');
  if (serverText) {
    const sanitized = serverText.replace(
      /"resolveAlias":\{[^{}]*"@neondatabase\/serverless"[^{}]*\},/g,
      '"resolveAlias":{},',
    );
    await writeFile(serverFile, sanitized);
  }
}

async function sanitizeNextManifests(root) {
  const backendNextRoot = path.join(root, 'apps', 'backend', '.next');
  await sanitizeJsonFile(path.join(backendNextRoot, 'app-path-routes-manifest.json'), (manifest) => {
    if (!isRecord(manifest)) return manifest;
    for (const key of Object.keys(manifest)) {
      const value = manifest[key];
      if (isCloudRoute(key) || (typeof value === 'string' && isCloudRoute(value))) {
        delete manifest[key];
      }
    }
    return manifest;
  });

  await sanitizeJsonFile(path.join(backendNextRoot, 'routes-manifest.json'), (manifest) => {
    if (!isRecord(manifest)) return manifest;
    for (const key of ['staticRoutes', 'dynamicRoutes']) {
      if (Array.isArray(manifest[key])) {
        manifest[key] = manifest[key].filter((entry) => !isRecord(entry) || !isCloudRoute(String(entry.page ?? '')));
      }
    }
    return manifest;
  });

  await sanitizeRequiredServerFilesJs(path.join(backendNextRoot, 'required-server-files.js'));

  await sanitizeJsonFile(path.join(backendNextRoot, 'required-server-files.json'), (manifest) => {
    if (!isRecord(manifest)) return manifest;
    if (Array.isArray(manifest.files)) {
      manifest.files = manifest.files.filter((file) => !isCloudBuildFile(String(file)));
    }
    const resolveAlias = manifest.config?.turbopack?.resolveAlias;
    if (isRecord(resolveAlias)) {
      delete resolveAlias['@neondatabase/serverless'];
      delete resolveAlias['drizzle-orm'];
      delete resolveAlias['drizzle-orm/neon-http'];
    }
    return manifest;
  });

  await sanitizeJsonFile(path.join(backendNextRoot, 'server', 'app-paths-manifest.json'), (manifest) => {
    if (!isRecord(manifest)) return manifest;
    for (const key of Object.keys(manifest)) {
      const value = manifest[key];
      if (isCloudRoute(key) || (typeof value === 'string' && isCloudBuildFile(value))) {
        delete manifest[key];
      }
    }
    return manifest;
  });

  await sanitizeJsonFile(path.join(backendNextRoot, 'server', 'functions-config-manifest.json'), (manifest) => {
    if (!isRecord(manifest?.functions)) return manifest;
    for (const key of Object.keys(manifest.functions)) {
      if (isCloudRoute(key)) {
        delete manifest.functions[key];
      }
    }
    return manifest;
  });
}


async function sanitizeRequiredServerFilesJs(file) {
  let text = await readFile(file, 'utf8').catch(() => '');
  if (!text) return;

  text = text
    .replace(/^\s*"@neondatabase\/serverless":\s*"[^\n]+\n/gm, '')
    .replace(/^\s*"drizzle-orm":\s*"[^\n]+\n/gm, '')
    .replace(/^\s*"drizzle-orm\/neon-http":\s*"[^\n]+\n/gm, '');

  await writeFile(file, text);
}

async function pruneUnreferencedForbiddenChunks(root) {
  const backendNextRoot = path.join(root, 'apps', 'backend', '.next');
  const chunksRoot = path.join(backendNextRoot, 'server', 'chunks');
  const referencedChunks = await collectReferencedChunks(path.join(backendNextRoot, 'server', 'app'));
  const blocking = [];

  if (!existsSync(chunksRoot)) return;

  await walk(chunksRoot, async (file) => {
    const text = await readFile(file, 'utf8').catch(() => '');
    if (!text || !hasForbiddenDbMarker(text)) return;
    const chunkRef = path.relative(backendNextRoot, file).replaceAll(path.sep, '/');
    if (referencedChunks.has(chunkRef)) {
      blocking.push(chunkRef);
      return;
    }
    await rm(file, { force: true });
  });

  if (blocking.length > 0) {
    throw new Error(`Local runtime still references DB-bearing server chunks:\n${blocking.join('\n')}`);
  }
}

async function collectReferencedChunks(root) {
  const references = new Set();
  if (!existsSync(root)) return references;

  await walk(root, async (file) => {
    if (!file.endsWith('.js')) return;
    const text = await readFile(file, 'utf8').catch(() => '');
    for (const match of text.matchAll(/R\.c\("([^"]+)"\)/g)) {
      references.add(match[1]);
    }
  });

  return references;
}

async function sanitizeJsonFile(file, sanitizer) {
  const text = await readFile(file, 'utf8').catch(() => '');
  if (!text) return;
  const json = JSON.parse(text);
  await writeFile(file, `${JSON.stringify(sanitizer(json), null, 2)}\n`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCloudRoute(route) {
  return cloudApiPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function isCloudBuildFile(file) {
  return cloudApiPrefixes.some((prefix) => {
    const buildPath = prefix.slice(1).replaceAll('/', '/');
    return file.includes(`${buildPath}/`) || file.includes(`${buildPath}\\`);
  });
}

function hasForbiddenDbMarker(text) {
  return forbiddenDbMarkers.some((pattern) => pattern.test(text));
}

async function writeLaunchers(root) {
  const envExample = [
    'SPICE_RUNTIME_TARGET=local',
    'HOSTNAME=127.0.0.1',
    'PORT=3939',
    'SPICE_CLOUD_API_ORIGIN=https://music.spice-app.xyz',
    'SPICE_STREAM_HMAC_SECRET=replace-with-a-random-local-secret',
    '',
  ].join('\r\n');

  const cmd = [
    '@echo off',
    'set SPICE_RUNTIME_TARGET=local',
    'set HOSTNAME=127.0.0.1',
    'set PORT=3939',
    'if "%SPICE_CLOUD_API_ORIGIN%"=="" set SPICE_CLOUD_API_ORIGIN=https://music.spice-app.xyz',
    'node server.js',
    '',
  ].join('\r\n');

  const ps1 = [
    '$env:SPICE_RUNTIME_TARGET = "local"',
    '$env:HOSTNAME = "127.0.0.1"',
    '$env:PORT = "3939"',
    'if (-not $env:SPICE_CLOUD_API_ORIGIN) { $env:SPICE_CLOUD_API_ORIGIN = "https://music.spice-app.xyz" }',
    'node "$PSScriptRoot\\server.js"',
    '',
  ].join('\r\n');

  const manifest = {
    name: 'SPICE Local PC Runtime',
    runtimeTarget: 'local',
    host: '127.0.0.1',
    port: 3939,
    localApiPrefix: '/api/local',
    cloudApiPrefix: '/api/cloud',
    cloudApiOrigin: 'https://music.spice-app.xyz',
  };

  await writeFile(path.join(root, '.env.local.example'), envExample);
  await writeFile(path.join(root, 'start-spice-local.cmd'), cmd);
  await writeFile(path.join(root, 'start-spice-local.ps1'), ps1);
  await writeFile(path.join(root, 'spice-local-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function scanForForbiddenLocalPayload(root) {
  const offenders = [];

  await walk(root, async (file) => {
    const relative = path.relative(root, file).replaceAll(path.sep, '/');
    if (/\.(png|jpg|jpeg|gif|ico|webp|woff2?)$/i.test(file)) return;
    const text = await readFile(file, 'utf8').catch(() => '');
    if (!text) return;
    if (hasForbiddenDbMarker(text)) {
      offenders.push(relative);
    }
  });

  if (offenders.length > 0) {
    throw new Error(`Local package contains forbidden DB markers:\n${offenders.join('\n')}`);
  }
}

async function walk(dir, visitor) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, visitor);
    } else if (entry.isFile()) {
      await visitor(fullPath);
    }
  }
}
