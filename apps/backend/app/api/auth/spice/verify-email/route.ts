import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { emailVerificationChallenges, profiles, users } from '@/db/schema';
import { and, eq, gt, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { signSession } from '@/lib/auth';
import { getInitialAccountRoleForEmail, serializeAccount } from '@/lib/account';
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_REGISTRATION_TTL_MS,
  emailVerificationExpiryState,
  isEmailVerificationAtomicClaimCurrent,
  normalizeEmailVerificationCode,
  verifyEmailVerificationCode,
} from '@/lib/email-verification';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const { registrationId, code: rawCode } = await request.json().catch(() => ({}));
    const code = normalizeEmailVerificationCode(rawCode);
    if (typeof registrationId !== 'string' || !registrationId || !code) {
      return jsonResponse(
        { error: 'invalid_verification_code', message: 'Enter the six-digit verification code.' },
        { status: 400 },
        request,
      );
    }
    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        { error: 'database_not_configured', message: 'Cloud account service is not configured.' },
        { status: 500 },
        request,
      );
    }

    const challenge = await db.query.emailVerificationChallenges.findFirst({
      where: eq(emailVerificationChallenges.id, registrationId),
    });
    const now = new Date();
    const expiryState = challenge
      ? emailVerificationExpiryState(challenge.createdAt, challenge.expiresAt, now)
      : 'registration_expired';
    if (!challenge || challenge.consumedAt || expiryState === 'registration_expired') {
      if (challenge) {
        await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
      }
      return jsonResponse(
        { error: 'verification_expired', message: 'This verification code has expired. Request a new code.' },
        { status: 400 },
        request,
      );
    }
    if (expiryState === 'code_expired') {
      return jsonResponse(
        { error: 'verification_code_expired', message: 'This code expired. Request a replacement code.' },
        { status: 400 },
        request,
      );
    }
    if (challenge.attemptCount >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      return jsonResponse(
        { error: 'verification_locked', message: 'Too many incorrect attempts. Request a new code.' },
        { status: 429 },
        request,
      );
    }

    const [reservedAttempt] = await db.update(emailVerificationChallenges)
      .set({ attemptCount: sql`${emailVerificationChallenges.attemptCount} + 1` })
      .where(and(
        eq(emailVerificationChallenges.id, registrationId),
        eq(emailVerificationChallenges.codeHash, challenge.codeHash),
        isNull(emailVerificationChallenges.consumedAt),
        lt(emailVerificationChallenges.attemptCount, EMAIL_VERIFICATION_MAX_ATTEMPTS),
      ))
      .returning({ attemptCount: emailVerificationChallenges.attemptCount });
    if (!reservedAttempt) {
      return jsonResponse(
        { error: 'verification_locked', message: 'This code changed or has too many incorrect attempts. Request a new code.' },
        { status: 429 },
        request,
      );
    }

    if (!verifyEmailVerificationCode(registrationId, code, challenge.codeHash)) {
      const remainingAttempts = Math.max(0, EMAIL_VERIFICATION_MAX_ATTEMPTS - reservedAttempt.attemptCount);
      return jsonResponse(
        { error: 'invalid_verification_code', message: 'That verification code is incorrect.', remainingAttempts },
        { status: 400 },
        request,
      );
    }

    const [existingEmail, existingUserUsername, existingProfileUsername] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.email, challenge.email) }),
      db.query.users.findFirst({ where: eq(users.username, challenge.username) }),
      db.query.profiles.findFirst({ where: eq(profiles.username, challenge.username) }),
    ]);
    if (existingEmail) {
      await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
      return jsonResponse(
        { error: 'email_exists', message: 'An account with this email address already exists. Sign in instead.' },
        { status: 409 },
        request,
      );
    }
    if (existingUserUsername || existingProfileUsername) {
      await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
      return jsonResponse(
        { error: 'username_taken', message: 'That username was claimed while you were verifying. Start registration again with another username.' },
        { status: 409 },
        request,
      );
    }

    const accountRole = getInitialAccountRoleForEmail(challenge.email);
    const registrationCutoff = new Date(now.getTime() - EMAIL_VERIFICATION_REGISTRATION_TTL_MS);
    
    const [claimedChallenge] = await db.update(emailVerificationChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(emailVerificationChallenges.id, registrationId),
        eq(emailVerificationChallenges.codeHash, challenge.codeHash),
        isNull(emailVerificationChallenges.consumedAt),
        gt(emailVerificationChallenges.expiresAt, now),
        gte(emailVerificationChallenges.createdAt, registrationCutoff),
        lte(emailVerificationChallenges.attemptCount, EMAIL_VERIFICATION_MAX_ATTEMPTS),
      ))
      .returning();

    let newUser;
    if (claimedChallenge) {
      const [insertedUser] = await db.insert(users)
        .values({
          email: claimedChallenge.email,
          username: claimedChallenge.username,
          passwordHash: claimedChallenge.passwordHash,
          accountRole: accountRole,
          emailVerifiedAt: claimedChallenge.consumedAt,
        })
        .onConflictDoNothing()
        .returning();
      newUser = insertedUser;
    }

    if (!newUser) {
      const latestChallenge = await db.query.emailVerificationChallenges.findFirst({
        where: eq(emailVerificationChallenges.id, registrationId),
      });
      const latestExpiryState = latestChallenge
        ? emailVerificationExpiryState(latestChallenge.createdAt, latestChallenge.expiresAt, new Date())
        : 'registration_expired';

      if (!latestChallenge || latestExpiryState === 'registration_expired') {
        if (latestChallenge) {
          await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
        }
        return jsonResponse(
          { error: 'verification_expired', message: 'This verification code has expired. Request a new code.' },
          { status: 400 },
          request,
        );
      }
      if (latestExpiryState === 'code_expired' && !latestChallenge.consumedAt) {
        return jsonResponse(
          { error: 'verification_code_expired', message: 'This code expired. Request a replacement code.' },
          { status: 400 },
          request,
        );
      }
      if (latestChallenge.codeHash !== challenge.codeHash && !latestChallenge.consumedAt) {
        return jsonResponse(
          { error: 'verification_code_changed', message: 'A newer verification code was requested. Use the latest code from your inbox.' },
          { status: 409 },
          request,
        );
      }
      if (latestChallenge.attemptCount >= EMAIL_VERIFICATION_MAX_ATTEMPTS && !latestChallenge.consumedAt) {
        return jsonResponse(
          { error: 'verification_locked', message: 'Too many incorrect attempts. Request a new code.' },
          { status: 429 },
          request,
        );
      }

      const latestClaimIsCurrent = isEmailVerificationAtomicClaimCurrent(
        latestChallenge,
        challenge.codeHash,
        new Date(),
      );
      if (latestExpiryState === 'active' && latestClaimIsCurrent) {
        return jsonResponse(
          { error: 'verification_changed', message: 'Verification changed while it was being completed. Try the latest code again.' },
          { status: 409 },
          request,
        );
      }

      await db.delete(emailVerificationChallenges).where(eq(emailVerificationChallenges.id, registrationId));
      return jsonResponse(
        { error: 'registration_conflict', message: 'This email or username was just claimed. Try signing in or register again.' },
        { status: 409 },
        request,
      );
    }

    await db.delete(emailVerificationChallenges)
      .where(eq(emailVerificationChallenges.email, challenge.email));

    const account = serializeAccount(newUser);
    const token = await signSession({
      userId: newUser.id,
      email: newUser.email,
      accountRole: account.accountRole,
    });

    return jsonResponse({ token, user: account, account }, {}, request);
  } catch (error) {
    console.error('SPICE email verification failed:', error);
    return jsonResponse(
      { error: 'verification_failed', message: 'Email verification failed. Try again.' },
      { status: 500 },
      request,
    );
  }
}
