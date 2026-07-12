import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { oauthLinks } from '@/db/schema';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';

const LASTFM_PROVIDER = 'lastfm';
const LASTFM_SCOPES = 'scrobble now_playing';
const LISTENBRAINZ_PROVIDER = 'listenbrainz';
const LISTENBRAINZ_SCOPES = 'submit-listens';
const LISTENBRAINZ_LINKED_USER = 'ListenBrainz';

interface SaveLastFmConnectionInput {
  userId: string;
  linkedUser: string;
  sessionKey: string;
}

export interface LastFmAccountConnection {
  linkedUser: string;
  sessionKey: string;
  linkedAt: Date;
}

export interface ListenBrainzAccountConnection {
  token: string;
  linkedAt: Date;
}

interface SaveListenBrainzConnectionInput {
  userId: string;
  token: string;
}

export async function saveLastFmConnection(input: SaveLastFmConnectionInput) {
  const encryptedSessionKey = encryptSecret(input.sessionKey);
  const [saved] = await db.insert(oauthLinks).values({
    userId: input.userId,
    provider: LASTFM_PROVIDER,
    providerUserId: input.linkedUser,
    refreshTokenEnc: encryptedSessionKey,
    scopes: LASTFM_SCOPES,
  }).onConflictDoUpdate({
    target: [oauthLinks.userId, oauthLinks.provider],
    set: {
      providerUserId: input.linkedUser,
      refreshTokenEnc: encryptedSessionKey,
      scopes: LASTFM_SCOPES,
      linkedAt: new Date(),
    },
  }).returning();

  return saved;
}

export async function getLastFmConnection(userId: string): Promise<LastFmAccountConnection | null> {
  const link = await db.query.oauthLinks.findFirst({
    where: and(
      eq(oauthLinks.userId, userId),
      eq(oauthLinks.provider, LASTFM_PROVIDER),
    ),
  });

  if (!link) return null;

  return {
    linkedUser: link.providerUserId,
    sessionKey: decryptSecret(link.refreshTokenEnc),
    linkedAt: link.linkedAt,
  };
}

export async function saveListenBrainzConnection(input: SaveListenBrainzConnectionInput) {
  const encryptedToken = encryptSecret(input.token);
  const [saved] = await db.insert(oauthLinks).values({
    userId: input.userId,
    provider: LISTENBRAINZ_PROVIDER,
    providerUserId: LISTENBRAINZ_LINKED_USER,
    refreshTokenEnc: encryptedToken,
    scopes: LISTENBRAINZ_SCOPES,
  }).onConflictDoUpdate({
    target: [oauthLinks.userId, oauthLinks.provider],
    set: {
      providerUserId: LISTENBRAINZ_LINKED_USER,
      refreshTokenEnc: encryptedToken,
      scopes: LISTENBRAINZ_SCOPES,
      linkedAt: new Date(),
    },
  }).returning();

  return saved;
}

export async function getListenBrainzConnection(userId: string): Promise<ListenBrainzAccountConnection | null> {
  const link = await db.query.oauthLinks.findFirst({
    where: and(
      eq(oauthLinks.userId, userId),
      eq(oauthLinks.provider, LISTENBRAINZ_PROVIDER),
    ),
  });

  if (!link) return null;

  return {
    token: decryptSecret(link.refreshTokenEnc),
    linkedAt: link.linkedAt,
  };
}

export async function deleteListenBrainzConnection(userId: string) {
  await db.delete(oauthLinks).where(and(
    eq(oauthLinks.userId, userId),
    eq(oauthLinks.provider, LISTENBRAINZ_PROVIDER),
  ));
}
