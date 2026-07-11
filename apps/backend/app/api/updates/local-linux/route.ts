import { jsonResponse, optionsResponse } from '@/lib/cors';
import { buildLocalLinuxUpdateManifest } from '@/lib/local-updates';
import { requireCloudRuntime } from '@/lib/runtime-target';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export function GET(request: Request) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return jsonResponse(buildLocalLinuxUpdateManifest(), {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
    },
  }, request);
}
