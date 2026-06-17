export interface TrackArtistSnapshot {
  id: string;
  name: string;
  artworkUrl?: string;
}

export interface TrackAlbumSnapshot {
  id: string;
  title: string;
  artists: TrackArtistSnapshot[];
  artworkUrl?: string;
  year?: number;
}

export interface TrackSnapshot {
  id: string;
  title: string;
  artists: TrackArtistSnapshot[];
  album?: TrackAlbumSnapshot;
  durationMs?: number;
  artworkUrl?: string;
  sourceId?: string;
  permalinkUrl?: string;
  previewOnly?: boolean;
}

export interface SearchCacheEntry {
  query: string;
  tracks: TrackSnapshot[];
  savedAt: number;
  sourceId?: string;
}

export interface PlaybackSaveState {
  currentTrack: TrackSnapshot;
  queue: TrackSnapshot[];
  queueIndex: number;
  progress: number;
  savedAt: number;
}

interface StoredTrackSnapshot {
  track: TrackSnapshot;
  savedAt: number;
}

const TRACK_SNAPSHOTS_KEY = 'spice_track_snapshots_v1';
const SEARCH_CACHE_KEY = 'spice_search_cache_v1';
const PLAYBACK_STATES_KEY = 'spice_playback_states_v1';
const MAX_TRACK_SNAPSHOTS = 500;
const MAX_SEARCH_ENTRIES = 12;
const MAX_SEARCH_TRACKS = 30;

function getStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not persist ${key}:`, error);
  }
}

function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

function isUsefulTrack(track: TrackSnapshot | undefined): track is TrackSnapshot {
  return !!track && !!track.id && track.id !== 'placeholder';
}

function snapshotScore(track: TrackSnapshot) {
  let score = 0;
  if (track.title && track.title !== 'Track' && track.title !== 'Unknown track') score += 3;
  if (track.artists?.length) score += 2;
  if (track.artworkUrl) score += 3;
  if (track.durationMs) score += 1;
  if (track.album?.title) score += 1;
  return score;
}

export function mergeTrackSnapshots(
  existing: TrackSnapshot | undefined,
  incoming: TrackSnapshot,
): TrackSnapshot {
  if (!existing || existing.id !== incoming.id) return incoming;

  const preferred = snapshotScore(incoming) >= snapshotScore(existing) ? incoming : existing;
  const fallback = preferred === incoming ? existing : incoming;

  return {
    ...fallback,
    ...preferred,
    title: preferred.title && preferred.title !== 'Track' ? preferred.title : fallback.title,
    artists: preferred.artists?.length ? preferred.artists : fallback.artists,
    album: preferred.album ?? fallback.album,
    durationMs: preferred.durationMs ?? fallback.durationMs,
    artworkUrl: preferred.artworkUrl ?? fallback.artworkUrl,
    sourceId: preferred.sourceId ?? fallback.sourceId,
    permalinkUrl: preferred.permalinkUrl ?? fallback.permalinkUrl,
    previewOnly: preferred.previewOnly ?? fallback.previewOnly,
  };
}

function getTrackSnapshotStore() {
  return readJson<Record<string, StoredTrackSnapshot>>(TRACK_SNAPSHOTS_KEY, {});
}

export function rememberTrackSnapshots(tracks: TrackSnapshot[]) {
  const snapshots = getTrackSnapshotStore();
  const savedAt = Date.now();

  for (const track of tracks) {
    if (!isUsefulTrack(track)) continue;
    snapshots[track.id] = {
      track: mergeTrackSnapshots(snapshots[track.id]?.track, track),
      savedAt,
    };
  }

  const trimmed = Object.fromEntries(
    Object.entries(snapshots)
      .sort(([, a], [, b]) => b.savedAt - a.savedAt)
      .slice(0, MAX_TRACK_SNAPSHOTS),
  );
  writeJson(TRACK_SNAPSHOTS_KEY, trimmed);
}

export function enrichTrackSnapshot(track: TrackSnapshot): TrackSnapshot {
  const saved = getTrackSnapshotStore()[track.id]?.track;
  return saved ? mergeTrackSnapshots(saved, track) : track;
}

export function mergeTrackLists(...lists: TrackSnapshot[][]): TrackSnapshot[] {
  const merged = new Map<string, TrackSnapshot>();

  for (const list of lists) {
    for (const track of list) {
      if (!isUsefulTrack(track)) continue;
      merged.set(track.id, enrichTrackSnapshot(mergeTrackSnapshots(merged.get(track.id), track)));
    }
  }

  return Array.from(merged.values());
}

export function rememberSearchResults(
  query: string,
  tracks: TrackSnapshot[],
  sourceId = 'youtube_music',
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || tracks.length === 0) return;

  rememberTrackSnapshots(tracks);
  const normalized = normalizeQuery(trimmedQuery);
  const entries = readJson<SearchCacheEntry[]>(SEARCH_CACHE_KEY, [])
    .filter((entry) => normalizeQuery(entry.query) !== normalized || (entry.sourceId ?? 'youtube_music') !== sourceId);

  entries.unshift({
    query: trimmedQuery,
    tracks: tracks.slice(0, MAX_SEARCH_TRACKS).map(enrichTrackSnapshot),
    savedAt: Date.now(),
    sourceId,
  });
  writeJson(SEARCH_CACHE_KEY, entries.slice(0, MAX_SEARCH_ENTRIES));
}

export function getCachedSearch(query: string, sourceId = 'youtube_music'): SearchCacheEntry | null {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const entry = readJson<SearchCacheEntry[]>(SEARCH_CACHE_KEY, [])
    .find((candidate) =>
      normalizeQuery(candidate.query) === normalized
      && (candidate.sourceId ?? 'youtube_music') === sourceId,
    );
  return entry
    ? { ...entry, tracks: entry.tracks.map(enrichTrackSnapshot) }
    : null;
}

export function getLatestCachedSearch(): SearchCacheEntry | null {
  const [entry] = readJson<SearchCacheEntry[]>(SEARCH_CACHE_KEY, [])
    .sort((a, b) => b.savedAt - a.savedAt);
  return entry
    ? { ...entry, tracks: entry.tracks.map(enrichTrackSnapshot) }
    : null;
}

export function getRecentCachedSearches(limit = 6): SearchCacheEntry[] {
  const seenQueries = new Set<string>();
  const entries = readJson<SearchCacheEntry[]>(SEARCH_CACHE_KEY, [])
    .sort((a, b) => b.savedAt - a.savedAt)
    .filter((entry) => {
      const normalized = normalizeQuery(entry.query);
      if (!normalized || seenQueries.has(normalized)) return false;
      seenQueries.add(normalized);
      return true;
    })
    .slice(0, limit);

  return entries.map((entry) => ({
    ...entry,
    tracks: entry.tracks.map(enrichTrackSnapshot),
  }));
}

export function savePlaybackState(profileId: string, state: PlaybackSaveState) {
  if (!profileId || !isUsefulTrack(state.currentTrack)) return;
  rememberTrackSnapshots([state.currentTrack, ...state.queue]);

  const states = readJson<Record<string, PlaybackSaveState>>(PLAYBACK_STATES_KEY, {});
  states[profileId] = state;
  writeJson(PLAYBACK_STATES_KEY, states);
}

export function getPlaybackState(profileId: string): PlaybackSaveState | null {
  const state = readJson<Record<string, PlaybackSaveState>>(PLAYBACK_STATES_KEY, {})[profileId];
  if (!state || !isUsefulTrack(state.currentTrack)) return null;

  return {
    ...state,
    currentTrack: enrichTrackSnapshot(state.currentTrack),
    queue: state.queue.map(enrichTrackSnapshot),
  };
}
