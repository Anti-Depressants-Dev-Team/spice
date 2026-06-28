import type { NextRequest } from 'next/server';

import { corsHeadersForRequest, jsonResponse, optionsResponse } from '@/lib/cors';
import { requireLocalMediaNamespace } from '@/lib/runtime-target';
import { verifySignedStream } from '@/lib/stream-signing';

/**
 * Audio stream proxy.
 *
 * Receives signed URLs from `/api/local/yt/track/[id]`, verifies the signature,
 * then proxies the upstream YouTube audio with Range-request support so
 * the browser's `<audio>` element can seek freely.
 */
export const runtime = 'nodejs';

export function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = requireLocalMediaNamespace(request);
  if (blocked) return blocked;

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
      request,
    );
  }

  const upstreamUrl = Buffer.from(encodedUrl, 'base64url').toString();

  const valid = verifySignedStream(
    { id, itag, upstreamUrl, expiresAt: expires },
    sig,
  );

  if (!valid) {
    return jsonResponse(
      { error: 'stream_expired', message: 'Stream URL has expired or signature is invalid. Fetch a new one from /api/local/yt/track/[id].' },
      { status: 403 },
      request,
    );
  }

  // Forward Range header from the browser so seeking works.
  const headers: Record<string, string> = {
    'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
  };
  let rangeHeader = request.headers.get('range');

  const isDownload = request.nextUrl.searchParams.get('download') === 'true';

  if (isDownload) {
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }
  } else {
    // Optimize Vercel Fluid Compute: chunking
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
    if (!rangeHeader) {
        rangeHeader = `bytes=0-${CHUNK_SIZE - 1}`;
    } else {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : start + CHUNK_SIZE - 1;
        rangeHeader = `bytes=${start}-${Math.min(end, start + CHUNK_SIZE - 1)}`;
    }
    headers['Range'] = rangeHeader;
  }

  try {
    let upstream;
    try {
      console.log(`[stream-proxy] Fetching upstream: ${upstreamUrl.substring(0, 100)}...`);
      upstream = await fetch(upstreamUrl, { headers });
      console.log(`[stream-proxy] Upstream response status: ${upstream.status}`);
    } catch (fetchErr) {
      console.warn(`[stream-proxy] Proxy fetch failed. Falling back to HTTP 307 Redirect. Error:`, fetchErr);
      return Response.redirect(upstreamUrl, 307);
    }

    if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
      console.warn(`[stream-proxy] Upstream failed with status ${upstream.status}. Falling back to HTTP 307 Redirect.`);
      return Response.redirect(upstreamUrl, 307);
    }

    if (upstream.status === 416) {
        // Range Not Satisfiable
        return new Response(null, {
            status: 416,
            headers: { ...corsHeadersForRequest(request), 'Content-Range': upstream.headers.get('content-range') || 'bytes */*' }
        });
    }

    // Build response headers for the browser.
    const responseHeaders: Record<string, string> = { ...corsHeadersForRequest(request) };

    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders['Content-Type'] = contentType;

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    responseHeaders['Accept-Ranges'] = 'bytes';
    // Prevent the browser from caching stale signed URLs.
    responseHeaders['Cache-Control'] = 'no-store';

    if (request.nextUrl.searchParams.get('download') === 'true') {
      const title = request.nextUrl.searchParams.get('title') || 'audio';
      // Keep sanitized ASCII for fallback filename
      const asciiTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'audio';
      // Use filename*=UTF-8'' for full Unicode support
      responseHeaders['Content-Disposition'] = `attachment; filename="${asciiTitle}.mp3"; filename*=UTF-8''${encodeURIComponent(title)}.mp3`;
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[stream-proxy] Error fetching upstream:`, error);
    return jsonResponse(
      {
        error: 'proxy_error',
        message: error instanceof Error ? error.message : 'Failed to proxy audio stream.',
      },
      { status: 502 },
      request,
    );
  }
}
