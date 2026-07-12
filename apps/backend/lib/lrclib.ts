interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export interface LyricsPayload {
  trackId: string;
  title: string;
  artist: string;
  durationMs: number;
  plainLyrics: string;
  syncedLyrics: string;
  isSynced: boolean;
}

interface ResolveLyricsInput {
  trackId: string;
  title: string;
  artist: string;
  durationMs: number;
}

const lyricsCache = new Map<string, { expiresAt: number; payload: LyricsPayload }>();
const LYRICS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MISSING_LYRICS_CACHE_TTL_MS = 10 * 60 * 1000;
const LYRICS_REQUEST_TIMEOUT_MS = 9000;

export async function resolveLyrics(input: ResolveLyricsInput): Promise<LyricsPayload> {
  const durationMs = input.durationMs || 180000;
  const durationSec = Math.round(durationMs / 1000);
  const searchTerms = deriveLyricsSearchTerms(
    cleanTrackTitle(input.title),
    cleanArtistName(input.artist),
    input.artist,
  );
  const title = searchTerms.title;
  const artist = searchTerms.artist;
  const cacheKey = lyricsCacheKey(input.trackId, title, artist, durationSec);
  const cached = getCachedLyrics(cacheKey);
  if (cached) return cached;

  let plainLyrics = '';
  let syncedLyrics = '';

  if (title) {
    const headers = { 'User-Agent': 'SPICE-Music-Player/1.0 (GitHub/razva)' };
    const [directMatch, rankedMatch] = await Promise.all([
      getDirectLyrics(title, artist, durationSec, headers),
      searchLyrics(title, artist, durationSec, headers),
    ]);
    const match = directMatch ?? rankedMatch;
    plainLyrics = match?.plainLyrics || '';
    syncedLyrics = match?.syncedLyrics || '';
  }

  const payload = {
    trackId: input.trackId,
    title: input.title,
    artist,
    durationMs,
    plainLyrics,
    syncedLyrics,
    isSynced: !!syncedLyrics,
  };
  lyricsCache.set(cacheKey, {
    expiresAt: Date.now() + (plainLyrics || syncedLyrics ? LYRICS_CACHE_TTL_MS : MISSING_LYRICS_CACHE_TTL_MS),
    payload,
  });
  return payload;
}

function lyricsCacheKey(trackId: string, title: string, artist: string, durationSec: number) {
  return [
    trackId,
    normalizeMatchText(title) || 'untitled',
    normalizeMatchText(artist) || 'unknown-artist',
    durationSec,
  ].join('::');
}

async function getDirectLyrics(
  title: string,
  artist: string,
  durationSec: number,
  headers: Record<string, string>,
) {
  try {
    const queryParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
      duration: String(durationSec),
    });
    const response = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`, {
      headers,
      signal: AbortSignal.timeout(LYRICS_REQUEST_TIMEOUT_MS),
    });
    return response.ok ? await response.json() as LrcLibTrack : null;
  } catch {
    // Suppress logging for expected network/lookup failures
    return null;
  }
}

async function searchLyrics(
  title: string,
  artist: string,
  durationSec: number,
  headers: Record<string, string>,
) {
  try {
    const searchParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    const response = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
      headers,
      signal: AbortSignal.timeout(LYRICS_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const results = await response.json() as LrcLibTrack[];
    return selectLyricsMatch(results, title, artist, durationSec) ?? null;
  } catch {
    // Suppress logging for expected network/lookup failures
    return null;
  }
}

function getCachedLyrics(id: string) {
  const cached = lyricsCache.get(id);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    lyricsCache.delete(id);
    return null;
  }
  return cached.payload;
}

function cleanTrackTitle(title: string) {
  return title
    .replace(/\s*(?:\([^)]*(?:official|video|audio|visualizer|lyrics?|remaster(?:ed)?|4k|hd)[^)]*\)|\[[^\]]*(?:official|video|audio|visualizer|lyrics?|remaster(?:ed)?|4k|hd)[^\]]*\])/gi, '')
    .trim();
}

function cleanArtistName(artist: string) {
  return artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s+official$/i, '')
    .replace(/vevo$/i, '')
    .trim();
}

function looksLikeVideoChannelArtist(artist: string) {
  return /(?:-\s*topic|vevo$|official$|youtube)/i.test(artist);
}

function deriveLyricsSearchTerms(title: string, artist: string, originalArtist: string) {
  const splitTitle = title.match(/^(.{2,80}?)\s+[-\u2013\u2014]\s+(.{2,160})$/);
  if (!splitTitle) return { title, artist };

  const candidateArtist = cleanArtistName(splitTitle[1]);
  const candidateTitle = cleanTrackTitle(splitTitle[2]);
  const normalizedArtist = normalizeMatchText(artist);
  const normalizedCandidateArtist = normalizeMatchText(candidateArtist);

  if (
    candidateTitle
    && candidateArtist
    && (
      !artist
      || looksLikeVideoChannelArtist(originalArtist)
      || normalizedArtist.includes(normalizedCandidateArtist)
      || normalizedCandidateArtist.includes(normalizedArtist)
    )
  ) {
    return {
      title: candidateTitle,
      artist: candidateArtist,
    };
  }

  return { title, artist };
}

function normalizeMatchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreLyricsMatch(track: LrcLibTrack, title: string, artist: string, durationSec: number) {
  const normalizedTitle = normalizeMatchText(title);
  const normalizedArtist = normalizeMatchText(artist);
  const candidateTitle = normalizeMatchText(track.trackName);
  const candidateArtist = normalizeMatchText(track.artistName);

  let score = 0;
  if (candidateTitle === normalizedTitle) score += 8;
  else if (candidateTitle.includes(normalizedTitle) || normalizedTitle.includes(candidateTitle)) score += 4;

  if (normalizedArtist && candidateArtist === normalizedArtist) score += 6;
  else if (normalizedArtist && (candidateArtist.includes(normalizedArtist) || normalizedArtist.includes(candidateArtist))) score += 3;

  const durationDifference = Math.abs(track.duration - durationSec);
  if (durationDifference <= 3) score += 3;
  else if (durationDifference <= 10) score += 1;

  if (track.syncedLyrics) score += 1;
  return score;
}

function selectLyricsMatch(results: LrcLibTrack[], title: string, artist: string, durationSec: number) {
  return results
    .filter((track) => track.syncedLyrics || track.plainLyrics)
    .map((track) => ({ track, score: scoreLyricsMatch(track, title, artist, durationSec) }))
    .filter(({ score }) => score >= 7)
    .sort((a, b) => b.score - a.score)[0]?.track;
}
