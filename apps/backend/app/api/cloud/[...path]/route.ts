import type { NextRequest } from 'next/server';

import { proxyToLegacyApi, namespaceOptionsResponse } from '@/lib/api-namespace-proxy';
import { requireCloudRuntime } from '@/lib/runtime-target';

export const runtime = 'nodejs';

const CLOUD_API_ROOTS = new Set([
  'account',
  'admin',
  'auth',
  'changelog',
  'feedback',
  'lastfm',
  'listen-together',
  'notifications',
  'playlists',
  'profile',
  'remote',
  'sync',
  'users',
  'version',
]);

interface RouteParams {
  params: Promise<{ path?: string[] }>;
}

export function OPTIONS(request: NextRequest) {
  return namespaceOptionsResponse(request);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, (await params).path ?? [], CLOUD_API_ROOTS, 'cloud');
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, (await params).path ?? [], CLOUD_API_ROOTS, 'cloud');
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, (await params).path ?? [], CLOUD_API_ROOTS, 'cloud');
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, (await params).path ?? [], CLOUD_API_ROOTS, 'cloud');
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const blocked = requireCloudRuntime(request);
  if (blocked) return blocked;

  return proxyToLegacyApi(request, (await params).path ?? [], CLOUD_API_ROOTS, 'cloud');
}
