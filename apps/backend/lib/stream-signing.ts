import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const localDevSecret = 'spice-local-dev-stream-secret';
const generatedLocalSecretEnvKey = 'SPICE_GENERATED_LOCAL_STREAM_HMAC_SECRET';

export interface SignedStreamInput {
  id: string;
  itag: number;
  upstreamUrl: string;
  expiresAt: number;
}

export function buildSignedStreamUrl(
  origin: string,
  input: SignedStreamInput,
  routePrefix = '/api/local/yt/stream',
) {
  const url = new URL(`${routePrefix}/${encodeURIComponent(input.id)}`, origin);
  url.searchParams.set('itag', String(input.itag));
  url.searchParams.set('expires', String(input.expiresAt));
  url.searchParams.set('u', Buffer.from(input.upstreamUrl).toString('base64url'));
  url.searchParams.set('sig', signStream(input));
  return url.toString();
}

export function verifySignedStream(input: SignedStreamInput, sig: string | null) {
  if (!sig) return false;
  if (Date.now() > input.expiresAt) return false;

  const expected = signStream(input);
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(sig);
  if (expectedBytes.length !== actualBytes.length) return false;
  return timingSafeEqual(expectedBytes, actualBytes);
}

function signStream(input: SignedStreamInput) {
  return createHmac('sha256', streamSecret())
    .update(input.id)
    .update('\n')
    .update(String(input.itag))
    .update('\n')
    .update(String(input.expiresAt))
    .update('\n')
    .update(input.upstreamUrl)
    .digest('base64url');
}

function streamSecret() {
  const secret =
    process.env.SPICE_STREAM_HMAC_SECRET ??
    process.env.STREAM_HMAC_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.SPICE_RUNTIME_TARGET === 'local') {
    const generatedSecret = process.env[generatedLocalSecretEnvKey] ?? randomBytes(32).toString('base64url');
    process.env[generatedLocalSecretEnvKey] = generatedSecret;
    return generatedSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STREAM_HMAC_SECRET is required in production');
  }
  return localDevSecret;
}
