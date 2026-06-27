import { db } from '../db/index.ts';
import { accountSubscriptions, users, profiles } from '../db/schema.ts';
import { serializeAccount, isAdminAccount, type AccountSnapshot } from './account.ts';
import type { SpiceSession } from './auth.ts';
import { eq } from 'drizzle-orm';

export class AccountAuthorizationError extends Error {
  public readonly code: 'account_not_found' | 'admin_required';

  constructor(
    code: 'account_not_found' | 'admin_required',
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = 'AccountAuthorizationError';
  }
}

export async function getAccountSnapshotForSession(session: Pick<SpiceSession, 'userId'>): Promise<AccountSnapshot | null> {
  return getAccountSnapshotForUserId(session.userId);
}

export async function getAccountSnapshotForUserId(userId: string): Promise<AccountSnapshot | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  if (!user.username || !user.username.includes('#')) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    const baseName = profile?.displayName || 'Spice Listener';
    const sanitizedBase = baseName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 12) || 'listener';

    let defaultUsername = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
      defaultUsername = `${sanitizedBase.toLowerCase()}#${digits}`;

      const existing = await db.query.users.findFirst({
        where: eq(users.username, defaultUsername),
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (isUnique) {
      await db.update(users).set({ username: defaultUsername }).where(eq(users.id, userId));
      user.username = defaultUsername;
    }
  }

  const subscription = await db.query.accountSubscriptions.findFirst({
    where: eq(accountSubscriptions.userId, userId),
  });

  return serializeAccount(user, subscription);
}

export async function requireAdminAccount(session: Pick<SpiceSession, 'userId'>): Promise<AccountSnapshot> {
  const account = await getAccountSnapshotForSession(session);

  if (!account) {
    throw new AccountAuthorizationError('account_not_found', 'The authenticated account no longer exists.');
  }

  if (!isAdminAccount(account)) {
    throw new AccountAuthorizationError('admin_required', 'This endpoint requires an admin account.');
  }

  return account;
}
