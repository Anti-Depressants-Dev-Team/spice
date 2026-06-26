import type { NextRequest } from 'next/server';

import { corsHeaders, jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySignedStream } from '@/lib/stream-signing';

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
  if (!verifySignedStream({ id, itag, upstreamUrl, expiresAt: expires }, sig)) {
    return jsonResponse(
      { error: 'stream_expired', message: 'SoundCloud stream URL has expired or its signature is invalid.' },
      { status: 403 },
    );
  }

  const headers: Record<string, string> = {
    'User-Agent': 'SPICE-Music-Player/1.0',
  };
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) headers.Range = rangeHeader;

  try {
    const upstream = await fetch(upstreamUrl, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      return Response.redirect(upstreamUrl, 307);
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    };
    for (const name of ['content-type', 'content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }

    if (request.nextUrl.searchParams.get('download') === 'true') {
      const title = request.nextUrl.searchParams.get('title') || 'audio';
      const asciiTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'audio';
      responseHeaders['Content-Disposition'] = `attachment; filename="${asciiTitle}.mp3"; filename*=UTF-8''${encodeURIComponent(title)}.mp3`;
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.redirect(upstreamUrl, 307);
  }
}
