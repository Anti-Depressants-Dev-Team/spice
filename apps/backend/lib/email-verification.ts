import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const EMAIL_VERIFICATION_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
export const EMAIL_VERIFICATION_REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_MAX_SENDS = 5;
export const EMAIL_VERIFICATION_EMAILS_PER_HOUR = 3;
export const EMAIL_VERIFICATION_IPS_PER_HOUR = 10;

export type EmailVerificationExpiryState = 'active' | 'code_expired' | 'registration_expired';

export interface EmailVerificationAtomicClaimState {
  codeHash: string;
  consumedAt?: Date | string | null;
  attemptCount: number;
  createdAt: Date | string;
  expiresAt: Date | string;
}

export function normalizeEmailAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254) return null;

  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return email;
}

export function createEmailVerificationCode(randomIntFn: (max: number) => number = randomInt): string {
  return String(randomIntFn(10 ** EMAIL_VERIFICATION_CODE_LENGTH)).padStart(EMAIL_VERIFICATION_CODE_LENGTH, '0');
}

export function normalizeEmailVerificationCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${EMAIL_VERIFICATION_CODE_LENGTH}}$`).test(code) ? code : null;
}

export function hashEmailVerificationCode(registrationId: string, code: string): string {
  return keyedDigest(`code:${registrationId}:${code}`);
}

export function verifyEmailVerificationCode(registrationId: string, code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashEmailVerificationCode(registrationId, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashVerificationRequestIp(request: Request): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return keyedDigest(`ip:${(vercelForwarded || ip).slice(0, 128)}`);
}

export function hashEmailVerificationRateKey(scope: 'email' | 'ip', value: string): string {
  return keyedDigest(`rate:${scope}:${value.trim().toLowerCase().slice(0, 320)}`);
}

export function verificationCodeExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
}

export function emailVerificationExpiryState(
  createdAt: Date | string,
  codeExpiresAt: Date | string,
  now: Date | number = Date.now(),
): EmailVerificationExpiryState {
  const created = new Date(createdAt).getTime();
  const codeExpiry = new Date(codeExpiresAt).getTime();
  const nowTime = now instanceof Date ? now.getTime() : now;
  if (![created, codeExpiry, nowTime].every(Number.isFinite)) return 'registration_expired';
  if (nowTime - created > EMAIL_VERIFICATION_REGISTRATION_TTL_MS) return 'registration_expired';
  if (codeExpiry <= nowTime) return 'code_expired';
  return 'active';
}

export function emailVerificationQuotaExceeded(emailAttempts: number, ipAttempts: number) {
  return emailAttempts > EMAIL_VERIFICATION_EMAILS_PER_HOUR
    || ipAttempts > EMAIL_VERIFICATION_IPS_PER_HOUR;
}

export function isEmailVerificationAtomicClaimCurrent(
  state: EmailVerificationAtomicClaimState,
  expectedCodeHash: string,
  now: Date | number = Date.now(),
) {
  return state.codeHash === expectedCodeHash
    && !state.consumedAt
    && Number.isInteger(state.attemptCount)
    && state.attemptCount > 0
    && state.attemptCount <= EMAIL_VERIFICATION_MAX_ATTEMPTS
    && emailVerificationExpiryState(state.createdAt, state.expiresAt, now) === 'active';
}
export function maskEmailAddress(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const shown = local.slice(0, Math.min(2, local.length));
  return `${shown}${'*'.repeat(Math.max(2, Math.min(8, local.length - shown.length)))}@${domain}`;
}

function keyedDigest(value: string): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_VERIFICATION_SECRET or JWT_SECRET is required in production.');
    }
    return createHmac('sha256', 'spice_email_verification_development_only').update(value).digest('hex');
  }
  return createHmac('sha256', secret).update(value).digest('hex');
}
