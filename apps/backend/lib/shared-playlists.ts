import { db } from '@/db';
import { playlistItems, playlistMembers, playlists, users, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

import { trackSnapshotFromRow } from './track-snapshot';

interface SharedPlaylistOptions {
  shared?: boolean;
  shareRole?: string;
  includeMembers?: boolean;
}

interface MemberInfo {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

async function getUserInfo(userId: string): Promise<{ username: string | null; displayName: string; avatarUrl: string | null }> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.userId, userId), eq(profiles.id, 'default')),
  });
  return {
    username: user?.username || null,
    displayName: profile?.displayName || user?.email || 'Unknown',
    avatarUrl: profile?.avatarUrl || null,
  };
}

export async function getPlaylistSnapshot(playlistId: string, options: SharedPlaylistOptions = {}) {
  const playlist = await db.query.playlists.findFirst({
    where: eq(playlists.id, playlistId),
  });

  if (!playlist || playlist.deletedAt) {
    return null;
  }

  const items = await db.query.playlistItems.findMany({
    where: eq(playlistItems.playlistId, playlist.id),
    orderBy: playlistItems.position,
  });

  // Build addedBy map for attribution
  const addedByUserIds = new Set(
    items.map((item) => item.addedByUserId).filter((id): id is string => !!id),
  );
  const addedByMap: Record<string, { username: string | null; displayName: string }> = {};
  for (const uid of addedByUserIds) {
    const info = await getUserInfo(uid);
    addedByMap[uid] = { username: info.username, displayName: info.displayName };
  }

  const tracks = items.map((item) => {
    const base = trackSnapshotFromRow(item);
    const addedBy = item.addedByUserId && addedByMap[item.addedByUserId]
      ? { userId: item.addedByUserId, ...addedByMap[item.addedByUserId] }
      : undefined;
    return {
      ...base,
      position: item.position,
      ...(addedBy ? { addedBy } : {}),
    };
  });

  // Optionally include member list
  let members: MemberInfo[] | undefined;
  if (options.includeMembers || options.shared) {
    const memberRows = await db.select().from(playlistMembers).where(eq(playlistMembers.playlistId, playlist.id));
    members = [];
    for (const row of memberRows) {
      if (row.userId === playlist.userId) continue;
      const info = await getUserInfo(row.userId);
      members.push({
        userId: row.userId,
        username: info.username,
        displayName: info.displayName,
        avatarUrl: info.avatarUrl,
        role: row.role,
      });
    }
  }

  // Get owner info
  const ownerInfo = await getUserInfo(playlist.userId);

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description || '',
    createdAt: playlist.updatedAt.toISOString(),
    gradient: playlist.gradient,
    coverUrl: playlist.coverUrl || null,
    tracks,
    ownerId: playlist.userId,
    ownerUsername: ownerInfo.username,
    ownerDisplayName: ownerInfo.displayName,
    ...(options.shared ? { shared: true } : {}),
    ...(options.shareRole ? { shareRole: options.shareRole } : {}),
    ...(members ? { members } : {}),
  };
}

