import type { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { buildSignedStreamUrl } from '@/lib/stream-signing';
import { getTrackDetails } from '@/lib/youtube';

/**
 * Browser proof: resolve a YT Music id to playable stream variants.
 * Returns short-TTL signed URLs the player passes to /api/yt/stream.
 */
export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const details = await getTrackDetails(id);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const origin = request.nextUrl.origin;
    return jsonResponse({
      track: details.track,
      streams: details.streams.map((stream) => ({
        ...stream,
        url: buildSignedStreamUrl(origin, {
          id,
          itag: stream.itag,
          upstreamUrl: stream.url,
          expiresAt,
        }),
        expiresAt: new Date(expiresAt).toISOString(),
      })),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'yt_track_failed',
        message:
          error instanceof Error ? error.message : 'Could not resolve this track.',
      },
      { status: 502 },
    );
  }
}
