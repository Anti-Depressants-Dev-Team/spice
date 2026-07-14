import { createHash } from 'crypto';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth/';
const DEFAULT_TIMEOUT_MS = 8000;

export interface LastFmApiCredentials {
  apiKey?: string;
  sharedSecret?: string;
}

export interface ProfileListenTrack {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  sourceId?: string;
  id?: string;
  permalinkUrl?: string;
}

interface LastFmSubmitInput {
  sessionKey: string;
  track: ProfileListenTrack;
  timestamp?: number;
  credentials?: LastFmApiCredentials;
}

interface LastFmApiResponse {
  error?: number;
  message?: string;
}

interface LastFmIgnoredMessage {
  '#text'?: string;
  code?: number | string;
}

interface LastFmScrobbleResponse extends LastFmApiResponse {
  scrobbles?: {
    '@attr'?: {
      accepted?: number | string;
      ignored?: number | string;
    };
    scrobble?: {
      ignoredMessage?: LastFmIgnoredMessage;
    } | Array<{
      ignoredMessage?: LastFmIgnoredMessage;
    }>;
  };
}

interface LastFmTokenResponse extends LastFmApiResponse {
  token?: string;
}

interface LastFmSessionResponse extends LastFmApiResponse {
  session?: {
    name?: string;
    key?: string;
    subscriber?: number;
  };
}

export async function submitLastFmNowPlaying(input: LastFmSubmitInput) {
  return postLastFm({
    method: 'track.updateNowPlaying',
    sessionKey: input.sessionKey,
    track: input.track,
    credentials: input.credentials,
  });
}

export async function submitLastFmScrobble(input: LastFmSubmitInput) {
  if (!input.timestamp) {
    throw new Error('Last.fm scrobble requires a playback start timestamp.');
  }

  const response = await postLastFm<LastFmScrobbleResponse>({
    method: 'track.scrobble',
    sessionKey: input.sessionKey,
    track: input.track,
    credentials: input.credentials,
    extraParams: {
      timestamp: String(input.timestamp),
    },
  });

  assertLastFmScrobbleAccepted(response);
  return response;
}

export async function createLastFmAuthToken(credentials: LastFmApiCredentials) {
  const resolvedCredentials = resolveLastFmCredentials(credentials);
  const data = await postLastFmAuth<LastFmTokenResponse>(
    {
      method: 'auth.getToken',
      api_key: resolvedCredentials.apiKey,
      format: 'json',
    },
    resolvedCredentials.sharedSecret,
  );

  if (!data.token) {
    throw new Error('Last.fm did not return an auth token.');
  }

  return {
    token: data.token,
    authUrl: `${LASTFM_AUTH_URL}?${new URLSearchParams({
      api_key: resolvedCredentials.apiKey,
      token: data.token,
    }).toString()}`,
  };
}

export function createLastFmWebAuthUrl(credentials: LastFmApiCredentials = {}, callbackUrl?: string) {
  const resolvedCredentials = resolveLastFmCredentials(credentials);
  const params = new URLSearchParams({
    api_key: resolvedCredentials.apiKey,
  });
  const trimmedCallbackUrl = callbackUrl?.trim();
  if (trimmedCallbackUrl) {
    params.set('cb', trimmedCallbackUrl);
  }

  return {
    authUrl: `${LASTFM_AUTH_URL}?${params.toString()}`,
    callbackUrl: trimmedCallbackUrl || undefined,
  };
}

export async function createLastFmSession(credentials: LastFmApiCredentials & { token: string }) {
  const token = credentials.token.trim();
  if (!token) {
    throw new Error('Last.fm auth token is required.');
  }

  const resolvedCredentials = resolveLastFmCredentials(credentials);
  const data = await postLastFmAuth<LastFmSessionResponse>(
    {
      method: 'auth.getSession',
      token,
      api_key: resolvedCredentials.apiKey,
      format: 'json',
    },
    resolvedCredentials.sharedSecret,
  );

  const sessionKey = data.session?.key?.trim();
  if (!sessionKey) {
    throw new Error('Last.fm did not return a session key.');
  }

  return {
    sessionKey,
    name: data.session?.name,
    subscriber: data.session?.subscriber,
  };
}

async function postLastFm<T extends LastFmApiResponse = LastFmApiResponse>({
  method,
  sessionKey,
  track,
  credentials,
  extraParams = {},
}: {
  method: 'track.updateNowPlaying' | 'track.scrobble';
  sessionKey: string;
  track: ProfileListenTrack;
  credentials?: LastFmApiCredentials;
  extraParams?: Record<string, string>;
}) {
  const resolvedCredentials = resolveLastFmCredentials(credentials);

  const params: Record<string, string> = {
    method,
    artist: track.artist,
    track: track.title,
    api_key: resolvedCredentials.apiKey,
    sk: sessionKey,
    format: 'json',
    ...extraParams,
  };

  if (track.album) {
    params.album = track.album;
  }
  if (track.durationMs) {
    params.duration = String(Math.max(1, Math.round(track.durationMs / 1000)));
  }

  params.api_sig = signLastFmParams(params, resolvedCredentials.sharedSecret);

  const data = await postLastFmParams<T>(params);
  return data;
}

function assertLastFmScrobbleAccepted(response: LastFmScrobbleResponse) {
  if (!response.scrobbles) {
    throw new Error('Last.fm did not acknowledge the scrobble.');
  }

  const accepted = Number(response.scrobbles['@attr']?.accepted);
  const scrobble = Array.isArray(response.scrobbles.scrobble)
    ? response.scrobbles.scrobble[0]
    : response.scrobbles.scrobble;
  const ignoredMessage = scrobble?.ignoredMessage;
  const ignoredCode = Number(ignoredMessage?.code || 0);

  if (accepted > 0 && ignoredCode === 0) return;

  const detail = ignoredMessage?.['#text']?.trim()
    || lastFmIgnoredCodeMessage(ignoredCode)
    || 'Last.fm filtered the scrobble.';
  throw new Error(detail);
}

function lastFmIgnoredCodeMessage(code: number) {
  return {
    1: 'Last.fm filtered the artist metadata.',
    2: 'Last.fm filtered the track metadata.',
    3: 'Last.fm rejected the scrobble because its timestamp was too old.',
    4: 'Last.fm rejected the scrobble because its timestamp was too new.',
    5: 'Last.fm rejected the scrobble because the daily limit was reached.',
  }[code];
}

async function postLastFmAuth<T extends LastFmApiResponse>(params: Record<string, string>, sharedSecret: string) {
  const signedParams = {
    ...params,
    api_sig: signLastFmParams(params, sharedSecret),
  };
  return postLastFmParams<T>(signedParams);
}

async function postLastFmParams<T extends LastFmApiResponse>(params: Record<string, string>) {
  const response = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SPICE-Music-Player/1.0',
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({})) as T;

  if (!response.ok || data.error) {
    throw new Error(data.message || `Last.fm profile update failed with status ${response.status}.`);
  }

  return data;
}

function resolveLastFmCredentials(credentials?: LastFmApiCredentials) {
  const apiKey = credentials?.apiKey?.trim() || process.env.LASTFM_API_KEY?.trim();
  const sharedSecret = credentials?.sharedSecret?.trim()
    || process.env.LASTFM_SHARED_SECRET?.trim()
    || process.env.LASTFM_API_SECRET?.trim();
  if (!apiKey || !sharedSecret) {
    throw new Error('Set Last.fm API key and shared secret in the backend env.');
  }

  return { apiKey, sharedSecret };
}

function signLastFmParams(params: Record<string, string>, sharedSecret: string) {
  const signatureBase = Object.entries(params)
    .filter(([key]) => key !== 'format' && key !== 'callback' && key !== 'api_sig')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join('');

  return createHash('md5')
    .update(`${signatureBase}${sharedSecret}`, 'utf8')
    .digest('hex');
}
