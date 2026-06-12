import { db } from '@/db';
import { playlistItems, playlists } from '@/db/schema';
import { eq } from 'drizzle-orm';

import { trackSnapshotFromRow } from './track-snapshot';

interface SharedPlaylistOptions {
  shared?: boolean;
  shareRole?: string;
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

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description || '',
    createdAt: playlist.updatedAt.toISOString(),
    gradient: playlist.gradient,
    tracks: items.map(trackSnapshotFromRow),
    ownerId: playlist.userId,
    ...(options.shared ? { shared: true } : {}),
    ...(options.shareRole ? { shareRole: options.shareRole } : {}),
  };
}
