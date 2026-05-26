import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'spice_super_secret_signing_key_32_characters_minimum';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SpiceSession {
  userId: string;
  email: string;
}

export async function signSession(session: SpiceSession): Promise<string> {
  return await new SignJWT({ userId: session.userId, email: session.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SpiceSession> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    userId: payload.userId as string,
    email: payload.email as string,
  };
}
