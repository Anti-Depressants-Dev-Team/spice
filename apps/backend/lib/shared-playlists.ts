import { db } from '@/db';
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
      where: inArray(profiles.userId, uniqueIds),
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

type UserInfo = { username: string | null; displayName: string; avatarUrl: string | null };

async function _getUserInfo(userId: string): Promise<UserInfo> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
  return {
    username: user?.username || null,
    displayName: profile?.displayName || user?.email || 'Unknown',
    avatarUrl: profile?.avatarUrl || null,
  };
}

async function _getBatchUserInfo(userIds: string[]): Promise<Record<string, UserInfo>> {
  if (userIds.length === 0) return {};

  const fetchedUsers = await db.query.users.findMany({ where: inArray(users.id, userIds) });
  const fetchedProfiles = await db.query.profiles.findMany({
    where: inArray(profiles.userId, userIds),
  });

  const profileMap = new Map(fetchedProfiles.map(p => [p.userId, p]));
  const userMap = new Map(fetchedUsers.map(u => [u.id, u]));

  const result: Record<string, UserInfo> = {};
  for (const uid of userIds) {
    const user = userMap.get(uid);
    const profile = profileMap.get(uid);
    if (user) {
      result[uid] = {
        username: user.username || null,
        displayName: profile?.displayName || user.email || 'Unknown',
        avatarUrl: profile?.avatarUrl || null,
      };
    }
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

  let memberRows: typeof playlistMembers.$inferSelect[] = [];
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
    isPublic: playlist.isPublic,
    tracks,
    ownerId: playlist.userId,
    ownerUsername: ownerInfo?.username || null,
    ownerDisplayName: ownerInfo?.displayName || 'Unknown',
    ...(options.shared ? { shared: true } : {}),
    ...(options.shareRole ? { shareRole: options.shareRole } : {}),
    ...(members ? { members } : {}),
  };
}


export async function getPlaylistSnapshotsBatch(playlistIds: string[], optionsMap: Record<string, SharedPlaylistOptions> = {}) {
  if (playlistIds.length === 0) return [];

  const fetchedPlaylists = await db.query.playlists.findMany({
    where: inArray(playlists.id, playlistIds),
  });

  const validPlaylists = fetchedPlaylists.filter(p => !p.deletedAt);
  if (validPlaylists.length === 0) return [];
  const validIds = validPlaylists.map(p => p.id);

  const items = await db.query.playlistItems.findMany({
    where: inArray(playlistItems.playlistId, validIds),
    orderBy: playlistItems.position,
  });

  const playlistsNeedingMembers = validIds.filter(id => {
    const opts = optionsMap[id] || {};
    return opts.includeMembers || opts.shared;
  });

  let allMemberRows: typeof playlistMembers.$inferSelect[] = [];
  if (playlistsNeedingMembers.length > 0) {
    allMemberRows = await db.select().from(playlistMembers).where(
      and(
        inArray(playlistMembers.playlistId, playlistsNeedingMembers),
        eq(playlistMembers.status, 'accepted')
      )
    );
  }

  const allUserIds = new Set<string>();
  validPlaylists.forEach(p => allUserIds.add(p.userId));
  items.forEach(item => {
    if (item.addedByUserId) allUserIds.add(item.addedByUserId);
  });
  allMemberRows.forEach(row => allUserIds.add(row.userId));

  const usersInfoMap = await getUsersInfo(Array.from(allUserIds));

  const itemsByPlaylist = new Map<string, typeof items>();
  items.forEach(item => {
    if (!itemsByPlaylist.has(item.playlistId)) itemsByPlaylist.set(item.playlistId, []);
    itemsByPlaylist.get(item.playlistId)!.push(item);
  });

  const membersByPlaylist = new Map<string, typeof allMemberRows>();
  allMemberRows.forEach(row => {
    if (!membersByPlaylist.has(row.playlistId)) membersByPlaylist.set(row.playlistId, []);
    membersByPlaylist.get(row.playlistId)!.push(row);
  });

  const results = [];
  for (const playlist of validPlaylists) {
    const opts = optionsMap[playlist.id] || {};
    const playlistItems = itemsByPlaylist.get(playlist.id) || [];
    const playlistMemberRows = membersByPlaylist.get(playlist.id) || [];

    const tracks = playlistItems.map(item => {
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

    let members: MemberInfo[] | undefined;
    if (opts.includeMembers || opts.shared) {
      members = [];
      for (const row of playlistMemberRows) {
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

    const ownerInfo = usersInfoMap[playlist.userId];

    results.push({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description || '',
      createdAt: playlist.updatedAt.toISOString(),
      gradient: playlist.gradient,
      coverUrl: playlist.coverUrl || null,
      isPublic: playlist.isPublic,
      tracks,
      ownerId: playlist.userId,
      ownerUsername: ownerInfo?.username || null,
      ownerDisplayName: ownerInfo?.displayName || 'Unknown',
      ...(opts.shared ? { shared: true } : {}),
      ...(opts.shareRole ? { shareRole: opts.shareRole } : {}),
      ...(members ? { members } : {}),
    });
  }

  return results;
}
