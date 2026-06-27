import { jsonResponse, optionsResponse } from '@/lib/cors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/hash';
import { signSession } from '@/lib/auth';
import { getInitialAccountRoleForEmail, serializeAccount } from '@/lib/account';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return jsonResponse(
        {
          error: 'invalid_inputs',
          message: 'Both email and password are required to sign up.',
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const normEmail = email.toLowerCase().trim();

    if (!process.env.DATABASE_URL) {
      return jsonResponse(
        {
          error: 'database_not_configured',
          message: 'Backend DATABASE_URL environment variable is not configured. Please configure it in your Vercel settings.',
        },
        { status: 500 }
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
        { status: 409 }
      );
    }

    // Generate a default unique username with an 8-digit suffix
    const baseName = 'spice_listener';
    let defaultUsername = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
      defaultUsername = `${baseName}#${digits}`;
      const existing = await db.query.users.findFirst({
        where: eq(users.username, defaultUsername),
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    const passwordHash = hashPassword(password);
    const accountRole = getInitialAccountRoleForEmail(normEmail);
    const [newUser] = await db.insert(users).values({
      email: normEmail,
      passwordHash,
      accountRole,
      username: defaultUsername,
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
    });
  } catch (error) {
    return jsonResponse(
      {
        error: 'signup_failed',
        message: error instanceof Error ? error.message : 'User registration failed.',
      },
      { status: 500 }
    );
  }
}
