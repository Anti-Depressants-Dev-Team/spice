import { NextResponse } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { localWindowsDownloadUrl } from '@/lib/local-updates';
import { requireCloudRuntime } from '@/lib/runtime-target';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  const downloadUrl = localWindowsDownloadUrl();
  if (!downloadUrl) {
    return jsonResponse({
      error: 'download_unavailable',
      message: 'The SPICE local Windows ZIP has not been published yet.',
    }, { status: 503 }, request);
  }

  return NextResponse.redirect(downloadUrl, 302);
}
