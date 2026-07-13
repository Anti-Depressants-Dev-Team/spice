import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { emailVerificationChallenges } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
  EMAIL_VERIFICATION_MAX_SENDS,
  emailVerificationQuotaExceeded,
  EMAIL_VERIFICATION_REGISTRATION_TTL_MS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  createEmailVerificationCode,
  hashEmailVerificationCode,
  maskEmailAddress,
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
    const { registrationId } = await request.json().catch(() => ({}));
    if (typeof registrationId !== 'string' || !registrationId) {
      return jsonResponse(
        { error: 'invalid_registration', message: 'Start registration again.' },
        { status: 400 },
        request,
      );
    }

    const challenge = await db.query.emailVerificationChallenges.findFirst({
      where: eq(emailVerificationChallenges.id, registrationId),
    });
    const now = new Date();
    if (!challenge || challenge.consumedAt
      || now.getTime() - challenge.createdAt.getTime() > EMAIL_VERIFICATION_REGISTRATION_TTL_MS) {
      return jsonResponse(
        { error: 'verification_expired', message: 'This registration has expired. Start again.' },
        { status: 400 },
        request,
      );
    }

    if (challenge.sendCount >= EMAIL_VERIFICATION_MAX_SENDS) {
      return jsonResponse(
        { error: 'verification_send_limit', message: 'Too many codes were sent. Start registration again later.' },
        { status: 429 },
        request,
      );
    }

    const cooldownRemaining = EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - (now.getTime() - challenge.lastSentAt.getTime());
    if (cooldownRemaining > 0) {
      const retryAfter = Math.ceil(cooldownRemaining / 1000);
      return jsonResponse(
        { error: 'resend_too_soon', message: `Wait ${retryAfter} seconds before requesting another code.`, retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        request,
      );
    }
    const { emailAttempts, ipAttempts } = await reserveEmailVerificationQuota({
      email: challenge.email,
      requestIpHash: challenge.requestIpHash,
      now,
    });
    if (emailVerificationQuotaExceeded(emailAttempts, ipAttempts)) {
      return jsonResponse(
        { error: 'verification_rate_limited', message: 'Too many verification requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
        request,
      );
    }

    const code = createEmailVerificationCode();
    const codeHash = hashEmailVerificationCode(registrationId, code);
    const expiresAt = verificationCodeExpiresAt(now);
    const sendCount = challenge.sendCount + 1;
    const [updatedChallenge] = await db.update(emailVerificationChallenges).set({
      codeHash,
      expiresAt,
      lastSentAt: now,
      attemptCount: 0,
      sendCount,
    }).where(and(
      eq(emailVerificationChallenges.id, registrationId),
      eq(emailVerificationChallenges.codeHash, challenge.codeHash),
      eq(emailVerificationChallenges.sendCount, challenge.sendCount),
      isNull(emailVerificationChallenges.consumedAt),
    )).returning({ id: emailVerificationChallenges.id });
    if (!updatedChallenge) {
      return jsonResponse(
        { error: 'resend_too_soon', message: 'A new code was already requested. Check your inbox.' },
        { status: 409 },
        request,
      );
    }

    try {
      await sendVerificationEmail({
        to: challenge.email,
        username: challenge.username,
        code,
        registrationId,
        sendCount,
      });
    } catch (error) {
      await db.update(emailVerificationChallenges).set({
        codeHash: challenge.codeHash,
        expiresAt: challenge.expiresAt,
        lastSentAt: challenge.lastSentAt,
        attemptCount: challenge.attemptCount,
        sendCount: challenge.sendCount,
      }).where(and(
        eq(emailVerificationChallenges.id, registrationId),
        eq(emailVerificationChallenges.codeHash, codeHash),
        isNull(emailVerificationChallenges.consumedAt),
      ));
      console.error('SPICE verification resend failed:', error);
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
        email: maskEmailAddress(challenge.email),
        expiresAt: expiresAt.toISOString(),
        resendAfterSeconds: Math.ceil(EMAIL_VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      },
      { status: 202 },
      request,
    );
  } catch (error) {
    console.error('SPICE verification resend failed:', error);
    return jsonResponse(
      { error: 'resend_failed', message: 'A new verification code could not be sent.' },
      { status: 500 },
      request,
    );
  }
}
