import { randomUUID } from 'node:crypto';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { emailVerificationChallenges, profiles, users } from '@/db/schema';
import { eq, lt } from 'drizzle-orm';
import { hashPasswordAsync } from '@/lib/hash';
import {
  EMAIL_VERIFICATION_REGISTRATION_TTL_MS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  createEmailVerificationCode,
  hashEmailVerificationCode,
  hashVerificationRequestIp,
  emailVerificationQuotaExceeded,
  maskEmailAddress,
  normalizeEmailAddress,
  verificationCodeExpiresAt,
} from '@/lib/email-verification';
import { reserveEmailVerificationQuota } from '@/lib/email-verification-rate-limit';
import { sendVerificationEmail } from '@/lib/email';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json().catch(() => ({}));
    if (typeof password !== 'string' || typeof username !== 'string') {
      return invalidInputs(request);
    }

    const normEmail = normalizeEmailAddress(email);
    if (!normEmail) {
      return jsonResponse(
        { error: 'invalid_email', message: 'Enter a valid email address.' },
        { status: 400 },
        request,
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{}|;:',./<>?~`])[A-Za-z\d@$!%*?&#^()_+=\-[\]{}|;:',./<>?~`]{8,}$/;
    if (!passwordRegex.test(password)) {
      return jsonResponse(
        {
          error: 'weak_password',
          message: 'Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
        },
        { status: 400 },
        request,
      );
    }

    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    const cleanUsername = username.trim().toLowerCase();
    if (!usernamePattern.test(cleanUsername)) {
      return jsonResponse(
        { error: 'invalid_username', message: 'Username must be 3–20 characters, containing only letters, numbers, and underscores.' },
        { status: 400 },
        request,
      );
    }

    if (!process.env.DATABASE_URL) {
      return databaseNotConfigured(request);
    }

    const [existingEmail, existingUserUsername, existingProfileUsername] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.email, normEmail) }),
      db.query.users.findFirst({ where: eq(users.username, cleanUsername) }),
      db.query.profiles.findFirst({ where: eq(profiles.username, cleanUsername) }),
    ]);

    if (existingEmail) {
      return jsonResponse(
        { error: 'email_exists', message: 'An account with this email address already exists.' },
        { status: 409 },
        request,
      );
    }
    if (existingUserUsername || existingProfileUsername) {
      return jsonResponse(
        { error: 'username_taken', message: 'This username is already taken.' },
        { status: 409 },
        request,
      );
    }

    const now = new Date();
    const staleCutoff = new Date(now.getTime() - EMAIL_VERIFICATION_REGISTRATION_TTL_MS);
    const requestIpHash = hashVerificationRequestIp(request);

    await db.delete(emailVerificationChallenges).where(lt(emailVerificationChallenges.createdAt, staleCutoff));
    const { emailAttempts, ipAttempts } = await reserveEmailVerificationQuota({
      email: normEmail,
      requestIpHash,
      now,
    });

    if (emailVerificationQuotaExceeded(emailAttempts, ipAttempts)) {
      return jsonResponse(
        { error: 'verification_rate_limited', message: 'Too many verification requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
        request,
      );
    }

    const registrationId = randomUUID();
    const code = createEmailVerificationCode();
    const expiresAt = verificationCodeExpiresAt(now);
    await db.insert(emailVerificationChallenges).values({
      id: registrationId,
      email: normEmail,
      username: cleanUsername,
      passwordHash: await hashPasswordAsync(password),
      codeHash: hashEmailVerificationCode(registrationId, code),
      requestIpHash,
      expiresAt,
    });

    try {
      await sendVerificationEmail({
        to: normEmail,
        username: cleanUsername,
        code,
        registrationId,
        sendCount: 1,
      });
    } catch (error) {
      await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
      console.error('SPICE verification email delivery failed:', error);
      return jsonResponse(
        { error: 'email_delivery_failed', message: 'The verification email could not be sent. Try again shortly.' },
        { status: 503 },
        request,
      );
    }

    return jsonResponse(
      {
        verificationRequired: true,
        registrationId,
        email: maskEmailAddress(normEmail),
        expiresAt: expiresAt.toISOString(),
        resendAfterSeconds: Math.ceil(EMAIL_VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      },
      { status: 202 },
      request,
    );
  } catch (error) {
    console.error('SPICE signup failed:', error);
    return jsonResponse(
      { error: 'signup_failed', message: 'User registration failed.' },
      { status: 500 },
      request,
    );
  }
}

function invalidInputs(request: Request) {
  return jsonResponse(
    { error: 'invalid_inputs', message: 'Email, password, and username are all required to sign up.' },
    { status: 400 },
    request,
  );
}

function databaseNotConfigured(request: Request) {
  return jsonResponse(
    { error: 'database_not_configured', message: 'Backend DATABASE_URL environment variable is not configured. Please configure it in your Vercel settings.' },
    { status: 500 },
    request,
  );
}
