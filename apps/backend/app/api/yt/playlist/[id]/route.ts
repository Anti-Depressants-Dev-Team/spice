import type { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { getPlaylistTracks } from '@/lib/youtube';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  if (!id) {
    return jsonResponse({ error: 'missing playlist id' }, { status: 400 });
  }

  try {
    const data = await getPlaylistTracks(id);
    return jsonResponse(data);
  } catch (error) {
    return jsonResponse(
      {
        error: 'yt_playlist_failed',
        message: error instanceof Error ? error.message : 'YouTube playlist import failed.',
      },
      { status: 502 },
    );
  }
}
