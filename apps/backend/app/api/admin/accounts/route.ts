import { db } from '@/db';
import { users, accountSubscriptions } from '@/db/schema';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';
import { requireAdminAccount, getAccountSnapshotForUserId } from '@/lib/accounts';
import { serializeAccount } from '@/lib/account';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'unauthorized', message: 'A bearer token is required to load the accounts list.' },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'DATABASE_URL is not set.' },
      { status: 500 },
    );
  }

  try {
    const session = await verifySession(auth.substring(7));
    // requireAdminAccount ensures the caller has 'admin' role in the DB
    await requireAdminAccount(session);

    const userRecords = await db.select().from(users);
    const subRecords = await db.select().from(accountSubscriptions);

    const subMap = new Map(subRecords.map((sub) => [sub.userId, sub]));
    const accounts = userRecords.map((u) => serializeAccount(u, subMap.get(u.id)));

    return jsonResponse({ accounts });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.name : 'error',
        message: error instanceof Error ? error.message : 'An error occurred.',
      },
      { status: error instanceof Error && error.name === 'AccountAuthorizationError' ? 403 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'unauthorized', message: 'A bearer token is required to update an account.' },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return jsonResponse(
      { error: 'database_not_configured', message: 'DATABASE_URL is not set.' },
      { status: 500 },
    );
  }

  try {
    const session = await verifySession(auth.substring(7));
    await requireAdminAccount(session);

    const body = await request.json();
    const { userId, accountRole, subscriptionTier, subscriptionStatus } = body;

    if (!userId) {
      return jsonResponse({ error: 'bad_request', message: 'userId is required.' }, { status: 400 });
    }

    // 1. Check if the target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return jsonResponse({ error: 'user_not_found', message: 'Target user does not exist.' }, { status: 404 });
    }

    // 2. Update users table if accountRole is provided
    if (accountRole !== undefined) {
      if (accountRole !== 'user' && accountRole !== 'admin' && accountRole !== 'banned') {
        return jsonResponse({ error: 'bad_request', message: 'Invalid account role.' }, { status: 400 });
      }
      await db.update(users)
        .set({ accountRole })
        .where(eq(users.id, userId));
    }

    // 3. Update or create accountSubscriptions if tier/status are provided
    if (subscriptionTier !== undefined || subscriptionStatus !== undefined) {
      const existingSub = await db.query.accountSubscriptions.findFirst({
        where: eq(accountSubscriptions.userId, userId),
      });

      const tier = subscriptionTier !== undefined ? subscriptionTier : (existingSub?.tier ?? 'free');
      const status = subscriptionStatus !== undefined ? subscriptionStatus : (existingSub?.status ?? 'inactive');

      if (existingSub) {
        await db.update(accountSubscriptions)
          .set({
            tier,
            status,
            updatedAt: new Date(),
          })
          .where(eq(accountSubscriptions.userId, userId));
      } else {
        await db.insert(accountSubscriptions)
          .values({
            userId,
            tier,
            status,
            updatedAt: new Date(),
          });
      }
    }

    // Return the updated snapshot
    const updatedAccount = await getAccountSnapshotForUserId(userId);
    return jsonResponse({ success: true, account: updatedAccount });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.name : 'error',
        message: error instanceof Error ? error.message : 'An error occurred.',
      },
      { status: error instanceof Error && error.name === 'AccountAuthorizationError' ? 403 : 500 },
    );
  }
}
