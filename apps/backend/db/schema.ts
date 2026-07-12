import { pgTable, text, timestamp, uuid, integer, bigint, boolean, primaryKey, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  accountRole: text('account_role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accountSubscriptions = pgTable(
  'account_subscriptions',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: text('tier').notNull().default('free'),
    status: text('status').notNull().default('inactive'),
    provider: text('provider'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('account_subscriptions_status_idx').on(t.status),
    index('account_subscriptions_provider_subscription_idx').on(t.provider, t.providerSubscriptionId),
  ],
);

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
  coverUrl: text('cover_url'),
  sortIndex: integer('sort_index').notNull().default(0),
  isPublic: boolean('is_public').notNull().default(true),
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
    addedByUserId: uuid('added_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.position] })],
);

export const playlistInvites = pgTable('playlist_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  playlistId: uuid('playlist_id')
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('listener'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const playlistMembers = pgTable(
  'playlist_members',
  {
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('listener'),
    status: text('status').notNull().default('accepted'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.userId] })],
);

export const remoteDevices = pgTable(
  'remote_devices',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(),
    displayName: text('display_name').notNull().default('SPICE Device'),
    currentTrackJson: text('current_track_json'),
    queueJson: text('queue_json').notNull().default('[]'),
    queueIndex: integer('queue_index').notNull().default(0),
    isPlaying: boolean('is_playing').notNull().default(false),
    shuffleEnabled: boolean('shuffle_enabled').notNull().default(false),
    repeatMode: text('repeat_mode').notNull().default('none'),
    progressMs: integer('progress_ms').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    volume: integer('volume').notNull().default(70),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.deviceId] })],
);

export const remoteCommands = pgTable('remote_commands', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  targetDeviceId: text('target_device_id').notNull(),
  sourceDeviceId: text('source_device_id').notNull(),
  command: text('command').notNull(),
  payloadJson: text('payload_json').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});

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
    username: text('username').unique(),
    bio: text('bio').notNull().default(''),
    gradient: text('gradient').notNull(),
    songsPlayed: integer('songs_played').notNull().default(0),
    joinedAt: text('joined_at').notNull(),
    passcode: text('passcode'),
    avatarUrl: text('avatar_url'),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const profileLikes = pgTable(
  'profile_likes',
  {
    likerUserId: uuid('liker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetUserId: uuid('target_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    likedAt: timestamp('liked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.likerUserId, t.targetUserId] })],
);
export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey().default('default'),
  emergencyAusterity: boolean('emergency_austerity').notNull().default(false),
  austerityThrottleRate: integer('austerity_throttle_rate').notNull().default(50),
  disableSync: boolean('disable_sync').notNull().default(false),
  emergencyStop: boolean('emergency_stop').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listenTogetherSessions = pgTable('listen_together_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostUserId: uuid('host_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  hostProfileId: text('host_profile_id').notNull().default('default'),
  currentTrackJson: text('current_track_json'),
  queueJson: text('queue_json').notNull().default('[]'),
  queueIndex: integer('queue_index').notNull().default(0),
  isPlaying: boolean('is_playing').notNull().default(false),
  progressMs: integer('progress_ms').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listenTogetherInvites = pgTable('listen_together_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => listenTogetherSessions.id, { onDelete: 'cascade' }),
  invitedUserId: uuid('invited_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackSubmissions = pgTable(
  'feedback_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    category: text('category').notNull(),
    content: text('content').notNull(),
    rating: integer('rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('feedback_submissions_user_idx').on(t.userId),
    index('feedback_submissions_created_at_idx').on(t.createdAt),
  ],
);
