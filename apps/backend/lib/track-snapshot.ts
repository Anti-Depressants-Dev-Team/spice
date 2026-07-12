export interface TrackSnapshotInput {
  id: string;
  title?: string;
  artists?: { id?: string; name?: string; artworkUrl?: string }[];
  artworkUrl?: string;
  durationMs?: number;
  sourceId?: string;
}

interface TrackSnapshotRow {
  trackId: string;
  sourceId: string;
  title: string;
  artistsJson: string;
  artworkUrl: string | null;
  durationMs: number | null;
}

function sanitizeArtists(artists: TrackSnapshotInput['artists']) {
  if (!Array.isArray(artists)) return [];

  return artists
    .filter((artist) => artist && typeof artist.name === 'string' && artist.name.trim())
    .map((artist) => ({
      id: artist.id || artist.name!,
      name: artist.name!,
      ...(artist.artworkUrl ? { artworkUrl: artist.artworkUrl } : {}),
    }));
}

export function trackSnapshotColumns(track: TrackSnapshotInput | undefined, _id: string) {
  return {
    title: track?.title?.trim() || 'Track',
    artistsJson: JSON.stringify(sanitizeArtists(track?.artists)),
    artworkUrl: track?.artworkUrl || null,
    durationMs: typeof track?.durationMs === 'number' ? Math.round(track.durationMs) : null,
  };
}

export function trackSnapshotFromRow(row: TrackSnapshotRow) {
  let artists: { id: string; name: string; artworkUrl?: string }[] = [];
  try {
    artists = sanitizeArtists(JSON.parse(row.artistsJson));
  } catch {
    artists = [];
  }

  return {
    id: row.trackId,
    sourceId: row.sourceId,
    title: row.title || 'Track',
    artists,
    ...(row.artworkUrl ? { artworkUrl: row.artworkUrl } : {}),
    ...(row.durationMs ? { durationMs: row.durationMs } : {}),
  };
}
