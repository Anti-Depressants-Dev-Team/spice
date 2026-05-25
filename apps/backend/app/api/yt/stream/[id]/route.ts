import type { NextRequest } from 'next/server';

import { corsHeaders, jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySignedStream } from '@/lib/stream-signing';

/**
 * Audio stream proxy.
 *
 * Receives signed URLs from `/api/yt/track/[id]`, verifies the signature,
 * then proxies the upstream YouTube audio with Range-request support so
 * the browser's `<audio>` element can seek freely.
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
  const sp = request.nextUrl.searchParams;
  const itag = Number(sp.get('itag'));
  const expires = Number(sp.get('expires'));
  const encodedUrl = sp.get('u');
  const sig = sp.get('sig');

  if (!encodedUrl || !sig || !Number.isFinite(itag) || !Number.isFinite(expires)) {
    return jsonResponse(
      { error: 'invalid_params', message: 'Missing or malformed stream parameters.' },
      { status: 400 },
    );
  }

  const upstreamUrl = Buffer.from(encodedUrl, 'base64url').toString();

  const valid = verifySignedStream(
    { id, itag, upstreamUrl, expiresAt: expires },
    sig,
  );

  if (!valid) {
    return jsonResponse(
      { error: 'stream_expired', message: 'Stream URL has expired or signature is invalid. Fetch a new one from /api/yt/track/[id].' },
      { status: 403 },
    );
  }

  // Forward Range header from the browser so seeking works.
  const headers: Record<string, string> = {
    'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
  };
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }

  try {
    const upstream = await fetch(upstreamUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return jsonResponse(
        {
          error: 'upstream_failed',
          message: `YouTube returned ${upstream.status}. The stream may have expired.`,
        },
        { status: 502 },
      );
    }

    // Build response headers for the browser.
    const responseHeaders: Record<string, string> = { ...corsHeaders };

    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders['Content-Type'] = contentType;

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    responseHeaders['Accept-Ranges'] = 'bytes';
    // Prevent the browser from caching stale signed URLs.
    responseHeaders['Cache-Control'] = 'no-store';

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'proxy_error',
        message: error instanceof Error ? error.message : 'Failed to proxy audio stream.',
      },
      { status: 502 },
    );
  }
}
