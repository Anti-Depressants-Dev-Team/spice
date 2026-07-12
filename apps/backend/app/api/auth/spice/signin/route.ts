import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/hash';
import { signSession } from '@/lib/auth';
import { getAccountSnapshotForUserId } from '@/lib/accounts';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return jsonResponse(
        {
          error: 'invalid_inputs',
          message: 'Both email and password are required to sign in.',
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

    const user = await db.query.users.findFirst({
      where: eq(users.email, normEmail),
    });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return jsonResponse(
        {
          error: 'invalid_credentials',
          message: 'Incorrect email or password. Please try again.',
        },
        { status: 401 },
        request,
      );
    }

    const account = await getAccountSnapshotForUserId(user.id);
    if (!account) {
      return jsonResponse(
        {
          error: 'account_not_found',
          message: 'The account for these credentials no longer exists.',
        },
        { status: 401 },
        request,
      );
    }

    if (account.accountRole === 'banned') {
      return jsonResponse(
        {
          error: 'account_banned',
          message: 'This account has been banned.',
        },
        { status: 403 },
        request,
      );
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
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
        error: 'signin_failed',
        message: error instanceof Error ? error.message : 'Sign in failed.',
      },
      { status: 500 },
      request,
    );
  }
}
