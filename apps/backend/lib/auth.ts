import { SignJWT, jwtVerify } from 'jose';
import { normalizeAccountRole, type AccountRole } from './account';

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SpiceSession {
  userId: string;
  email: string;
  accountRole: AccountRole;
}

interface LastFmLinkPayload {
  userId: string;
  email: string;
  accountRole?: string;
  purpose: 'lastfm_link';
}

export async function signSession(session: SpiceSession): Promise<string> {
  return await new SignJWT({
    userId: session.userId,
    email: session.email,
    accountRole: normalizeAccountRole(session.accountRole),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function signLastFmLinkState(session: SpiceSession): Promise<string> {
  return await new SignJWT({
    userId: session.userId,
    email: session.email,
    accountRole: normalizeAccountRole(session.accountRole),
    purpose: 'lastfm_link',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SpiceSession> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
    throw new Error('Invalid session token.');
  }

  return {
    userId: payload.userId,
    email: payload.email,
    accountRole: normalizeAccountRole(payload.accountRole),
  };
}

export async function verifyLastFmLinkState(token: string): Promise<SpiceSession> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const linkPayload = payload as unknown as LastFmLinkPayload;
  if (linkPayload.purpose !== 'lastfm_link') {
    throw new Error('Invalid Last.fm link state.');
  }

  return {
    userId: linkPayload.userId,
    email: linkPayload.email,
    accountRole: normalizeAccountRole(linkPayload.accountRole),
  };
}
