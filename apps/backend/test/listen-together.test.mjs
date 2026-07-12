import assert from 'node:assert/strict';
import test from 'node:test';

import { enableDatabaseIntegrationTests } from './database-test-helper.mjs';

const hasTestDb = enableDatabaseIntegrationTests();

test('Listen Together Sessions, Invites, and Sync - Integration Tests', { skip: !hasTestDb }, async (t) => {
  const { db } = await import('../db/index.ts');
  const schema = await import('../db/schema.ts');
  const drizzleOrm = await import('drizzle-orm');

  const { users, listenTogetherSessions, listenTogetherInvites, profiles } = schema;
  const { eq } = drizzleOrm;

  await t.test('Create session, invite user, accept invite, and sync playback state', async () => {
    const timestamp = Date.now();
    const hostEmail = `host-${timestamp}@example.com`;
    const listenerEmail = `listener-${timestamp}@example.com`;
    const hostUsername = `host_${timestamp}`;
    const listenerUsername = `listener_${timestamp}`;

    // 1. Create users
    const [hostUser] = await db.insert(users).values({ email: hostEmail, username: hostUsername }).returning();
    const [listenerUser] = await db.insert(users).values({ email: listenerEmail, username: listenerUsername }).returning();

    // Create profiles for display name join
    await db.insert(profiles).values({
      id: 'default',
      userId: hostUser.id,
      displayName: `Host Name ${timestamp}`,
      joinedAt: 'June 2026',
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    });
    await db.insert(profiles).values({
      id: 'default',
      userId: listenerUser.id,
      displayName: `Listener Name ${timestamp}`,
      joinedAt: 'June 2026',
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    });

    try {
      // 2. Create host session
      const [session] = await db.insert(listenTogetherSessions).values({
        hostUserId: hostUser.id,
      }).returning();

      assert.ok(session.id);
      assert.equal(session.hostUserId, hostUser.id);
      assert.equal(session.isPlaying, false);

      // 3. Invite listener
      const [invite] = await db.insert(listenTogetherInvites).values({
        sessionId: session.id,
        invitedUserId: listenerUser.id,
        invitedByUserId: hostUser.id,
        status: 'pending',
      }).returning();

      assert.ok(invite.id);
      assert.equal(invite.status, 'pending');

      // 4. Accept invite
      await db.update(listenTogetherInvites)
        .set({ status: 'accepted' })
        .where(eq(listenTogetherInvites.id, invite.id));

      const updatedInvite = await db.query.listenTogetherInvites.findFirst({
        where: eq(listenTogetherInvites.id, invite.id),
      });
      assert.equal(updatedInvite.status, 'accepted');

      // 5. Host updates sync playback state
      const mockTrack = { id: 'track_123', title: 'Together Song', artists: [{ name: 'Vibe Band' }] };
      await db.update(listenTogetherSessions)
        .set({
          currentTrackJson: JSON.stringify(mockTrack),
          isPlaying: true,
          progressMs: 12000,
          durationMs: 180000,
          updatedAt: new Date(),
        })
        .where(eq(listenTogetherSessions.id, session.id));

      // Fetch state as listener
      const sessionState = await db.query.listenTogetherSessions.findFirst({
        where: eq(listenTogetherSessions.id, session.id),
      });

      assert.equal(sessionState.isPlaying, true);
      assert.equal(sessionState.progressMs, 12000);
      assert.equal(JSON.parse(sessionState.currentTrackJson).id, 'track_123');

    } finally {
      // Cleanup
      await db.delete(listenTogetherInvites).where(eq(listenTogetherInvites.invitedByUserId, hostUser.id));
      await db.delete(listenTogetherSessions).where(eq(listenTogetherSessions.hostUserId, hostUser.id));
      await db.delete(profiles).where(eq(profiles.userId, hostUser.id));
      await db.delete(profiles).where(eq(profiles.userId, listenerUser.id));
      await db.delete(users).where(eq(users.id, hostUser.id));
      await db.delete(users).where(eq(users.id, listenerUser.id));
    }
  });
});
