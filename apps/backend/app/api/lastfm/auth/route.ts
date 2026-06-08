import type { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { createLastFmAuthToken, createLastFmSession, createLastFmWebAuthUrl } from '@/lib/lastfm';
import { signLastFmLinkState, verifySession } from '@/lib/auth';

export const runtime = 'nodejs';

interface LastFmAuthRequest {
  action?: 'web_auth' | 'token' | 'session';
  apiKey?: string;
  sharedSecret?: string;
  token?: string;
}

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  let body: LastFmAuthRequest;
  try {
    body = await request.json() as LastFmAuthRequest;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    if (body.action === 'web_auth') {
      const spiceSession = await optionalSession(request);
      const callbackUrl = new URL('/api/lastfm/callback', request.nextUrl.origin);
      if (spiceSession) {
        callbackUrl.searchParams.set('spice_state', await signLastFmLinkState(spiceSession));
      }

      return jsonResponse(createLastFmWebAuthUrl(
        {
          apiKey: body.apiKey,
          sharedSecret: body.sharedSecret,
        },
        callbackUrl.toString(),
      ));
    }

    if (body.action === 'token') {
      return jsonResponse(await createLastFmAuthToken({
        apiKey: body.apiKey,
        sharedSecret: body.sharedSecret,
      }));
    }

    if (body.action === 'session') {
      if (!body.token?.trim()) {
        return jsonResponse({ error: 'missing_token' }, { status: 400 });
      }

      return jsonResponse(await createLastFmSession({
        apiKey: body.apiKey,
        sharedSecret: body.sharedSecret,
        token: body.token,
      }));
    }

    return jsonResponse({ error: 'invalid_action' }, { status: 400 });
  } catch (error) {
    return jsonResponse(
      {
        error: 'lastfm_auth_failed',
        message: error instanceof Error ? error.message : 'Last.fm auth failed.',
      },
      { status: 502 },
    );
  }
}

async function optionalSession(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    return await verifySession(auth.substring(7));
  } catch {
    return null;
  }
}
