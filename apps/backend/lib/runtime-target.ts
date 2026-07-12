import { jsonResponse } from '@/lib/cors';
import { currentLocalRuntimeVersion, localUpdateManifestUrl } from '@/lib/local-updates';

export type SpiceRuntimeTarget = 'local' | 'vercel';

export function getRuntimeTarget(): SpiceRuntimeTarget {
  const configured = process.env.SPICE_RUNTIME_TARGET?.trim().toLowerCase();
  if (configured === 'local' || configured === 'vercel') return configured;
  return process.env.VERCEL ? 'vercel' : 'local';
}

export function isLocalRuntime() {
  return getRuntimeTarget() === 'local';
}

export function isCloudRuntime() {
  return getRuntimeTarget() === 'vercel';
}

export function requireLocalRuntime(request: Request) {
  if (!isLocalRuntime()) {
    return jsonResponse(
      {
        error: 'local_runtime_required',
        message: 'This media service route only runs in the SPICE local PC runtime.',
      },
      { status: 404 },
      request,
    );
  }

  const url = new URL(request.url);
  if (!isLoopbackHost(url.hostname)) {
    return jsonResponse(
      {
        error: 'loopback_required',
        message: 'Local media service routes only accept localhost or 127.0.0.1 requests.',
      },
      { status: 403 },
      request,
    );
  }

  return null;
}

export function requireCloudRuntime(request: Request) {
  if (!isCloudRuntime()) {
    return jsonResponse(
      {
        error: 'cloud_runtime_required',
        message: 'This account and sync route is served by the SPICE Vercel runtime.',
      },
      { status: 404 },
      request,
    );
  }

  return null;
}

export function requireLocalMediaNamespace(request: Request) {
  const namespace = request.headers.get('x-spice-api-namespace');
  if (namespace !== 'local') {
    return jsonResponse(
      {
        error: 'legacy_media_api_frozen',
        message: 'Media scraping and stream extraction moved to /api/local/* on the SPICE local PC runtime.',
      },
      { status: 410 },
      request,
    );
  }

  return requireLocalRuntime(request);
}

export function runtimeConfigPayload() {
  const cloudApiOrigin =
    process.env.SPICE_CLOUD_API_ORIGIN ||
    process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
    'https://music.spice-app.xyz';

  return {
    runtimeTarget: getRuntimeTarget(),
    cloudApiOrigin,
    localApiOrigin:
      process.env.SPICE_LOCAL_API_ORIGIN ||
      process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN ||
      'http://127.0.0.1:3939',
    localRuntimeVersion: currentLocalRuntimeVersion(),
    updateManifestUrl: localUpdateManifestUrl(cloudApiOrigin),
  };
}

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}
