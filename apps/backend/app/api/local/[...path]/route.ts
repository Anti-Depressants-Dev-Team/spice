import type { NextRequest } from 'next/server';

import { proxyToLegacyApi, namespaceOptionsResponse } from '@/lib/api-namespace-proxy';
import { jsonResponse } from '@/lib/cors';
import { currentLocalRuntimeVersion, fetchLocalWindowsUpdateStatus, localUpdateManifestUrl } from '@/lib/local-updates';
import { requireLocalRuntime, runtimeConfigPayload } from '@/lib/runtime-target';

export const runtime = 'nodejs';

const LOCAL_API_ROOTS = new Set(['yt', 'sc']);

interface RouteParams {
  params: Promise<{ path?: string[] }>;
}

export function OPTIONS(request: NextRequest) {
  return namespaceOptionsResponse(request);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const path = (await params).path ?? [];

  if (path.length === 1 && path[0] === 'health') {
    const blocked = requireLocalRuntime(request);
    if (blocked) return blocked;
    return jsonResponse({ ok: true, ...runtimeConfigPayload() }, { status: 200 }, request);
  }

  if (path.length === 1 && path[0] === 'update') {
    const blocked = requireLocalRuntime(request);
    if (blocked) return blocked;

    const currentVersion = currentLocalRuntimeVersion();
    const manifestUrl = localUpdateManifestUrl();
    try {
      const status = await fetchLocalWindowsUpdateStatus(currentVersion, manifestUrl);
      return jsonResponse({ ok: true, ...status }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }, request);
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: 'update_check_failed',
        message: error instanceof Error ? error.message : 'Unable to check for SPICE local updates.',
        currentVersion,
        manifestUrl,
      }, { status: 502 }, request);
    }
  }

  const blocked = requireLocalRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, path, LOCAL_API_ROOTS, 'local');
}
