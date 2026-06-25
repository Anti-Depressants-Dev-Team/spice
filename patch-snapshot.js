const fs = require('fs');

const filePath = 'apps/backend/lib/shared-playlists.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newCode = `export async function getPlaylistSnapshot(playlistId: string, options: SharedPlaylistOptions = {}) {
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
}`;

code = code.replace(/export async function getPlaylistSnapshot\([\s\S]*\}\n$/, newCode);

fs.writeFileSync(filePath, code);
