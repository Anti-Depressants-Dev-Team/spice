import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/hash';
import { signSession } from '@/lib/auth';
import { getInitialAccountRoleForEmail, serializeAccount } from '@/lib/account';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json().catch(() => ({}));
    if (!email || !password || !username) {
      return jsonResponse(
        {
          error: 'invalid_inputs',
          message: 'Email, password, and username are all required to sign up.',
        },
        { status: 400 },
        request,
      );
    }

    // Enforce password requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
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
        {
          error: 'invalid_username',
          message: 'Username must be 3–20 characters, containing only letters, numbers, and underscores.',
        },
        { status: 400 },
        request,
      );
    }

    const normEmail = email.toLowerCase().trim();

    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        {
          error: 'database_not_configured',
          message: 'Backend DATABASE_URL environment variable is not configured. Please configure it in your Vercel settings.',
        },
        { status: 500 },
        request,
      );
    }

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normEmail),
    });

    if (existing) {
      return jsonResponse(
        {
          error: 'email_exists',
          message: 'An account with this email address already exists.',
        },
        { status: 409 },
        request,
      );
    }

    // Check if username already exists
    const { profiles } = await import('@/db/schema');
    const existingUsername = await db.query.profiles.findFirst({
      where: eq(profiles.username, cleanUsername),
    });

    if (existingUsername) {
      return jsonResponse(
        {
          error: 'username_taken',
          message: 'This username is already taken.',
        },
        { status: 409 },
        request,
      );
    }

    const passwordHash = hashPassword(password);
    const accountRole = getInitialAccountRoleForEmail(normEmail);
    const [newUser] = await db.insert(users).values({
      email: normEmail,
      passwordHash,
      accountRole,
      username: cleanUsername,
    }).returning();

    const account = serializeAccount(newUser);
    const token = await signSession({
      userId: newUser.id,
      email: newUser.email,
      accountRole: account.accountRole,
    });

    return jsonResponse({
      token,
      user: account,
      account,
    }, {}, request);
  } catch (error) {
    return jsonResponse(
      {
        error: 'signup_failed',
        message: error instanceof Error ? error.message : 'User registration failed.',
      },
      { status: 500 },
      request,
    );
  }
}
