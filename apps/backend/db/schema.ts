import { pgTable, text, timestamp, uuid, integer, bigint, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const oauthLinks = pgTable(
  'oauth_links',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google', 'lastfm'
    providerUserId: text('provider_user_id').notNull(),
    refreshTokenEnc: text('refresh_token_enc').notNull(),
    scopes: text('scopes').notNull(),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider] })],
);

export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: text('profile_id').notNull().default('default'),
  title: text('title').notNull(),
  description: text('description'),
  gradient: text('gradient').notNull().default('linear-gradient(135deg, #a855f7, #ec4899)'),
  sortIndex: integer('sort_index').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const playlistItems = pgTable(
  'playlist_items',
  {
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    sourceId: text('source_id').notNull(),
    trackId: text('track_id').notNull(),
    title: text('title').notNull().default('Track'),
    artistsJson: text('artists_json').notNull().default('[]'),
    artworkUrl: text('artwork_url'),
    durationMs: integer('duration_ms'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.position] })],
);

export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileId: text('profile_id').notNull().default('default'),
    sourceId: text('source_id').notNull(),
    trackId: text('track_id').notNull(),
    title: text('title').notNull().default('Track'),
    artistsJson: text('artists_json').notNull().default('[]'),
    artworkUrl: text('artwork_url'),
    durationMs: integer('duration_ms'),
    likedAt: timestamp('liked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.profileId, t.sourceId, t.trackId] })],
);

export const history = pgTable('history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: text('profile_id').notNull().default('default'),
  sourceId: text('source_id').notNull(),
  trackId: text('track_id').notNull(),
  title: text('title').notNull().default('Track'),
  artistsJson: text('artists_json').notNull().default('[]'),
  artworkUrl: text('artwork_url'),
  durationMs: integer('duration_ms'),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  msListened: bigint('ms_listened', { mode: 'number' }).notNull(),
  deviceId: text('device_id'),
});

export const profiles = pgTable(
  'profiles',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    bio: text('bio').notNull().default(''),
    gradient: text('gradient').notNull(),
    songsPlayed: integer('songs_played').notNull().default(0),
    joinedAt: text('joined_at').notNull(),
    passcode: text('passcode'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);
