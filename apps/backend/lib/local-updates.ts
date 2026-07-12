import { SPICE_MEDIA_CORE_VERSION } from './release-notifications.ts';

export interface LocalRuntimeUpdateDownload {
  url: string;
  sha256?: string;
  sizeBytes?: number;
}

export interface LocalRuntimeUpdateManifest {
  runtime: 'spice-local';
  platform: LocalRuntimePlatform;
  channel: string;
  version: string;
  minimumSupportedVersion: string;
  releaseNotesUrl: string;
  generatedAt: string;
  download: LocalRuntimeUpdateDownload | null;
}

export interface LocalRuntimeUpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  downloadAvailable: boolean;
  manifestUrl: string;
  manifest: LocalRuntimeUpdateManifest;
}

const DEFAULT_CLOUD_API_ORIGIN = 'https://music.spice-app.xyz';
const DEFAULT_INSTALL_ORIGIN = 'https://install.spice-app.xyz';
const DEFAULT_CHANNEL = 'stable';
export type LocalRuntimePlatform = 'windows' | 'linux';
const DEFAULT_LOCAL_WINDOWS_DOWNLOAD_URL =
  'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip';
const DEFAULT_LOCAL_LINUX_DOWNLOAD_URL =
  'https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-linux.zip';

export function currentLocalRuntimeVersion() {
  return normalizeVersion(process.env.SPICE_LOCAL_RUNTIME_VERSION || SPICE_MEDIA_CORE_VERSION);
}

export function localUpdateManifestUrl(
  cloudApiOrigin = defaultCloudApiOrigin(),
  platform: LocalRuntimePlatform = 'windows',
) {
  const configured = process.env.SPICE_LOCAL_UPDATE_MANIFEST_URL?.trim();
  if (configured) return configured;
  return `${trimTrailingSlash(cloudApiOrigin)}/api/updates/local-${platform}`;
}

export function localWindowsDownloadUrl() {
  const configured = process.env.SPICE_LOCAL_WINDOWS_DOWNLOAD_URL?.trim();
  if (!configured) return DEFAULT_LOCAL_WINDOWS_DOWNLOAD_URL;
  return isHttpUrl(configured) ? configured : DEFAULT_LOCAL_WINDOWS_DOWNLOAD_URL;
}

export function localLinuxDownloadUrl() {
  const configured = process.env.SPICE_LOCAL_LINUX_DOWNLOAD_URL?.trim();
  if (!configured) return DEFAULT_LOCAL_LINUX_DOWNLOAD_URL;
  return isHttpUrl(configured) ? configured : DEFAULT_LOCAL_LINUX_DOWNLOAD_URL;
}

export function buildLocalWindowsUpdateManifest(): LocalRuntimeUpdateManifest {
  return buildLocalUpdateManifest('windows');
}

export function buildLocalLinuxUpdateManifest(): LocalRuntimeUpdateManifest {
  return buildLocalUpdateManifest('linux');
}

function buildLocalUpdateManifest(platform: LocalRuntimePlatform): LocalRuntimeUpdateManifest {
  const prefix = platform === 'linux' ? 'SPICE_LOCAL_LINUX' : 'SPICE_LOCAL_WINDOWS';
  const version = normalizeVersion(process.env[`${prefix}_VERSION`] || currentLocalRuntimeVersion());
  const downloadUrl = platform === 'linux' ? localLinuxDownloadUrl() : localWindowsDownloadUrl();
  const sha256 = process.env[`${prefix}_SHA256`]?.trim();
  const sizeBytes = Number(process.env[`${prefix}_SIZE_BYTES`]);

  return {
    runtime: 'spice-local',
    platform,
    channel: process.env.SPICE_LOCAL_UPDATE_CHANNEL?.trim() || DEFAULT_CHANNEL,
    version,
    minimumSupportedVersion: normalizeVersion(
      process.env[`${prefix}_MIN_VERSION`] || SPICE_MEDIA_CORE_VERSION,
    ),
    releaseNotesUrl:
      process.env[`${prefix}_RELEASE_NOTES_URL`]?.trim() ||
      installGuideUrl(),
    generatedAt: new Date().toISOString(),
    download: downloadUrl
      ? {
          url: downloadUrl,
          ...(sha256 ? { sha256 } : {}),
          ...(Number.isFinite(sizeBytes) && sizeBytes > 0 ? { sizeBytes } : {}),
        }
      : null,
  };
}

function installGuideUrl() {
  const origin = process.env.SPICE_INSTALL_ORIGIN?.trim() || DEFAULT_INSTALL_ORIGIN;
  return `${trimTrailingSlash(origin)}/`;
}

export async function fetchLocalWindowsUpdateStatus(
  currentVersion = currentLocalRuntimeVersion(),
  manifestUrl = localUpdateManifestUrl(),
): Promise<LocalRuntimeUpdateStatus> {
  const response = await fetch(manifestUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Update manifest request failed with status ${response.status}.`);
  }

  const manifest = await response.json() as LocalRuntimeUpdateManifest;
  const latestVersion = normalizeVersion(manifest.version || currentVersion);
  const normalizedCurrentVersion = normalizeVersion(currentVersion);

  return {
    currentVersion: normalizedCurrentVersion,
    latestVersion,
    updateAvailable: compareVersions(latestVersion, normalizedCurrentVersion) > 0,
    downloadAvailable: Boolean(manifest.download?.url),
    manifestUrl,
    manifest,
  };
}

export function compareVersions(a: string, b: string) {
  const left = versionParts(a);
  const right = versionParts(b);
  const length = Math.max(left.length, right.length, 3);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

function defaultCloudApiOrigin() {
  return (
    process.env.SPICE_CLOUD_API_ORIGIN ||
    process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
    DEFAULT_CLOUD_API_ORIGIN
  );
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '');
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function versionParts(version: string) {
  return normalizeVersion(version)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
