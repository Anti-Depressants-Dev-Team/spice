const fs = require('fs');

const code = `import { db } from '@/db';
import { playlistItems, playlistMembers, playlists, users, profiles } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

export async function getUsersInfo(userIds: string[]): Promise<Record<string, { username: string | null; displayName: string; avatarUrl: string | null }>> {
  if (userIds.length === 0) return {};

  const uniqueIds = Array.from(new Set(userIds));

  const [fetchedUsers, fetchedProfiles] = await Promise.all([
    db.query.users.findMany({ where: inArray(users.id, uniqueIds) }),
    db.query.profiles.findMany({
      where: and(inArray(profiles.userId, uniqueIds), eq(profiles.id, 'default')),
    }),
  ]);

  const userMap = new Map(fetchedUsers.map(u => [u.id, u]));
  const profileMap = new Map(fetchedProfiles.map(p => [p.userId, p]));

  const result: Record<string, { username: string | null; displayName: string; avatarUrl: string | null }> = {};

  for (const id of uniqueIds) {
    const user = userMap.get(id);
    const profile = profileMap.get(id);

    result[id] = {
      username: user?.username || null,
      displayName: profile?.displayName || user?.email || 'Unknown',
      avatarUrl: profile?.avatarUrl || null,
    };
  }

  return result;
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

  // Collect all unique user IDs to fetch in a single batch
  const allUserIds = new Set<string>();
  allUserIds.add(playlist.userId);

  items.forEach((item) => {
    if (item.addedByUserId) {
      allUserIds.add(item.addedByUserId);
    }
  });

  let memberRows: any[] = [];
  if (options.includeMembers || options.shared) {
    memberRows = await db.select().from(playlistMembers).where(and(eq(playlistMembers.playlistId, playlist.id), eq(playlistMembers.status, 'accepted')));
    memberRows.forEach((row) => {
      allUserIds.add(row.userId);
    });
  }

  // Fetch all users in one batch query
  const usersInfoMap = await getUsersInfo(Array.from(allUserIds));

  const tracks = items.map((item) => {
    const base = trackSnapshotFromRow(item);
    const addedByInfo = item.addedByUserId ? usersInfoMap[item.addedByUserId] : undefined;
    const addedBy = item.addedByUserId && addedByInfo
      ? { userId: item.addedByUserId, ...addedByInfo }
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
    members = [];
    for (const row of memberRows) {
      if (row.userId === playlist.userId) continue;
      const info = usersInfoMap[row.userId];
      if (info) {
        members.push({
          userId: row.userId,
          username: info.username,
          displayName: info.displayName,
          avatarUrl: info.avatarUrl,
          role: row.role,
        });
      }
    }
  }

  // Get owner info
  const ownerInfo = usersInfoMap[playlist.userId];

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description || '',
    createdAt: playlist.updatedAt.toISOString(),
    gradient: playlist.gradient,
    coverUrl: playlist.coverUrl || null,
    tracks,
    ownerId: playlist.userId,
    ownerUsername: ownerInfo?.username || null,
    ownerDisplayName: ownerInfo?.displayName || 'Unknown',
    ...(options.shared ? { shared: true } : {}),
    ...(options.shareRole ? { shareRole: options.shareRole } : {}),
    ...(members ? { members } : {}),
  };
}
`;

fs.writeFileSync('apps/backend/lib/shared-playlists.ts', code);
