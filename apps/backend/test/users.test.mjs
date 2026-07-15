import assert from 'node:assert/strict';
import test from 'node:test';

import { enableDatabaseIntegrationTests } from './database-test-helper.mjs';

const hasTestDb = enableDatabaseIntegrationTests();

test('User Profile, Privacy, Likes, and Search - Integration Tests', { skip: !hasTestDb }, async (t) => {
  const { db } = await import('../db/index.ts');
  const schema = await import('../db/schema.ts');
  const drizzleOrm = await import('drizzle-orm');

  const { users, profiles, playlists, profileLikes } = schema;
  const { eq, and, or, isNull, isNotNull, ilike } = drizzleOrm;

  await t.test('Profile display name sharing (no uniqueness constraint)', async () => {
    const timestamp = Date.now();
    const user1Email = `user1-${timestamp}@example.com`;
    const user2Email = `user2-${timestamp}@example.com`;
    const commonName = `SharedName_${timestamp}`;

    // 1. Create two users
    const [user1] = await db.insert(users).values({ email: user1Email, username: `u1_${timestamp}` }).returning();
    const [user2] = await db.insert(users).values({ email: user2Email, username: `u2_${timestamp}` }).returning();

    try {
      // 2. Set profile for User 1 with the name
      await db.insert(profiles).values({
        id: 'default',
        userId: user1.id,
        displayName: commonName,
        bio: 'User 1 bio',
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
        joinedAt: 'June 2026',
      });

      // 3. Set profile for User 2 with the SAME name (should succeed)
      await db.insert(profiles).values({
        id: 'default',
        userId: user2.id,
        displayName: commonName,
        bio: 'User 2 bio',
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
        joinedAt: 'June 2026',
      });

      const user1Prof = await db.query.profiles.findFirst({ where: eq(profiles.userId, user1.id) });
      const user2Prof = await db.query.profiles.findFirst({ where: eq(profiles.userId, user2.id) });

      assert.equal(user1Prof.displayName, commonName);
      assert.equal(user2Prof.displayName, commonName);
    } finally {
      // Clean up
      await db.delete(profiles).where(eq(profiles.userId, user1.id));
      await db.delete(profiles).where(eq(profiles.userId, user2.id));
      await db.delete(users).where(eq(users.id, user1.id));
      await db.delete(users).where(eq(users.id, user2.id));
    }
  });

  await t.test('Profile privacy hides bio and playlists', async () => {
    const timestamp = Date.now();
    const userEmail = `user-${timestamp}@example.com`;

    const [user] = await db.insert(users).values({ email: userEmail, username: `u_${timestamp}` }).returning();

    // Create private profile
    await db.insert(profiles).values({
      id: 'default',
      userId: user.id,
      displayName: `Private Listen ${timestamp}`,
      bio: 'Hidden bio details',
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
      joinedAt: 'June 2026',
      isPrivate: true,
    });

    // Create public and private playlists
    const [pubPlaylist] = await db.insert(playlists).values({
      userId: user.id,
      title: 'Public Playlist',
      isPublic: true,
    }).returning();

    await db.insert(playlists).values({
      userId: user.id,
      title: 'Private Playlist',
      isPublic: false,
    }).returning();

    try {
      // Fetch user profile settings simulating API behavior
      const dbProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user.id)
      });
      assert.ok(dbProfile);
      assert.equal(dbProfile.isPrivate, true);

      // Simulating isSelf vs other user view playlists resolving
      const dbPlaylists = await db.query.playlists.findMany({
        where: and(eq(playlists.userId, user.id), isNull(playlists.deletedAt))
      });

      const selfPlaylists = dbPlaylists;
      const visitorPlaylists = dbPlaylists.filter(pl => pl.isPublic);

      assert.equal(selfPlaylists.length, 2);
      assert.equal(visitorPlaylists.length, 1);
      assert.equal(visitorPlaylists[0].id, pubPlaylist.id);
    } finally {
      await db.delete(playlists).where(eq(playlists.userId, user.id));
      await db.delete(profiles).where(eq(profiles.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  await t.test('Profile liking mechanism', async () => {
    const timestamp = Date.now();
    const user1Email = `user1-${timestamp}@example.com`;
    const user2Email = `user2-${timestamp}@example.com`;

    const [user1] = await db.insert(users).values({ email: user1Email, username: `u1_${timestamp}` }).returning();
    const [user2] = await db.insert(users).values({ email: user2Email, username: `u2_${timestamp}` }).returning();

    try {
      // 1. Insert profile like
      await db.insert(profileLikes).values({
        likerUserId: user1.id,
        targetUserId: user2.id,
      });

      // 2. Query likes count
      const initialLikes = await db.select().from(profileLikes).where(eq(profileLikes.targetUserId, user2.id));
      assert.equal(initialLikes.length, 1);

      // 3. Remove profile like
      await db.delete(profileLikes).where(
        and(
          eq(profileLikes.likerUserId, user1.id),
          eq(profileLikes.targetUserId, user2.id)
        )
      );

      const afterUnlike = await db.select().from(profileLikes).where(eq(profileLikes.targetUserId, user2.id));
      assert.equal(afterUnlike.length, 0);
    } finally {
      await db.delete(users).where(eq(users.id, user1.id));
      await db.delete(users).where(eq(users.id, user2.id));
    }
  });

  await t.test('Username tag suffix generation and update logic', async () => {
    const timestamp = Date.now();
    const user1Email = `test-user1-${timestamp}@example.com`;
    const user2Email = `test-user2-${timestamp}@example.com`;

    // 1. Simulate legacy username on signup for User 1 using legacy 'spice_listener#timestamp' format
    const legacyUsername = `spice_listener#${timestamp}`;

    const [user1] = await db.insert(users).values({
      email: user1Email,
      username: legacyUsername,
    }).returning();

    // 2. Simulate older account (User 2) with NO username set (username is null)
    const [user2] = await db.insert(users).values({
      email: user2Email,
      username: null,
    }).returning();

    // Create default profile for User 2 with space in the name
    await db.insert(profiles).values({
      id: 'default',
      userId: user2.id,
      displayName: 'CallMeRyan Space Name',
      bio: 'Older account',
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
      joinedAt: 'June 2026',
    });

    try {
      const accountsLib = await import('../lib/accounts.ts');

      // 3. Trigger backfill / migration via getAccountSnapshotForUserId helper for User 1 (migrates legacy tag)
      await accountsLib.getAccountSnapshotForUserId(user1.id);

      const checkUser1 = await db.query.users.findFirst({
        where: eq(users.id, user1.id),
      });
      assert.ok(checkUser1);
      assert.ok(checkUser1.username);
      assert.ok(!checkUser1.username.includes('#'));
      assert.equal(checkUser1.username, `spice_listener_${timestamp}`.toLowerCase().substring(0, 20));

      // 4. Trigger backfill / migration via getAccountSnapshotForUserId helper for User 2 (generates clean display-name handle)
      await accountsLib.getAccountSnapshotForUserId(user2.id);

      const checkUser2 = await db.query.users.findFirst({
        where: eq(users.id, user2.id),
      });

      assert.ok(checkUser2);
      assert.ok(checkUser2.username);
      assert.ok(!checkUser2.username.includes('#'));
      assert.equal(checkUser2.username, 'callmeryan_space_name'.substring(0, 15));

      const checkUser2Profile = await db.query.profiles.findFirst({
        where: and(eq(profiles.userId, user2.id), eq(profiles.id, 'default')),
      });
      assert.ok(checkUser2Profile);
      assert.equal(checkUser2Profile.username, 'callmeryan_space_name'.substring(0, 15));

      // Create a second profile for User 2
      const altUsername = `alt_${timestamp}`.toLowerCase().substring(0, 20);
      await db.insert(profiles).values({
        id: 'profile_alt',
        userId: user2.id,
        displayName: 'CallMeRyan ALT',
        username: altUsername,
        bio: 'Alt account',
        gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
        joinedAt: 'June 2026',
      });

      const checkUser2AltProfile = await db.query.profiles.findFirst({
        where: and(eq(profiles.userId, user2.id), eq(profiles.id, 'profile_alt')),
      });
      assert.ok(checkUser2AltProfile);
      assert.equal(checkUser2AltProfile.username, altUsername);
      assert.notEqual(checkUser2Profile.username, checkUser2AltProfile.username);

      // 5. Update User 1 username to "newname"
      const newUsername = 'newname';
      await db.update(users).set({ username: newUsername }).where(eq(users.id, user1.id));

      const checkUser1Final = await db.query.users.findFirst({
        where: eq(users.id, user1.id),
      });
      assert.equal(checkUser1Final.username, newUsername);
    } finally {
      await db.delete(profiles).where(eq(profiles.userId, user2.id));
      await db.delete(users).where(eq(users.id, user1.id));
      await db.delete(users).where(eq(users.id, user2.id));
    }
  });

  await t.test('User search query leading @ strip verification', async () => {
    const timestamp = Date.now();
    const userEmail = `search-user-${timestamp}@example.com`;
    const targetUsername = `testsearch_${timestamp}#12345678`;

    const [user] = await db.insert(users).values({
      email: userEmail,
      username: targetUsername,
    }).returning();

    try {
      // Simulate search query with leading @
      const queryWithAt = `@testsearch_${timestamp}`;
      let processedQuery = queryWithAt.trim();
      if (processedQuery.startsWith('@')) {
        processedQuery = processedQuery.substring(1);
      }

      const searchResults = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(ilike(users.username, `%${processedQuery}%`));

      assert.ok(searchResults.length > 0);
      assert.equal(searchResults[0].id, user.id);
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  await t.test('User search excludes local-only profiles without a cloud username', async () => {
    const timestamp = Date.now();
    const [user] = await db.insert(users).values({
      email: `profile-search-${timestamp}@example.com`,
      username: `account_${timestamp}`,
    }).returning();
    const searchableName = `Listener_${timestamp}`;

    try {
      await db.insert(profiles).values([
        {
          id: 'default',
          userId: user.id,
          username: `listener_${timestamp}`,
          displayName: searchableName,
          gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
          joinedAt: 'July 2026',
        },
        {
          id: 'profile_local_only',
          userId: user.id,
          username: null,
          displayName: searchableName,
          gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
          joinedAt: 'July 2026',
        },
      ]);

      const results = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(
          isNotNull(profiles.username),
          or(
            ilike(profiles.username, `%${searchableName}%`),
            ilike(profiles.displayName, `%${searchableName}%`),
          ),
        ));

      assert.deepEqual(results.map((profile) => profile.id), ['default']);
    } finally {
      await db.delete(profiles).where(eq(profiles.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
