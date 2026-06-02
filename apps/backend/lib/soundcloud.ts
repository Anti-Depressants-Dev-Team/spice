import type { SpiceArtist, SpiceTrack } from './youtube';

const SOUNDCLOUD_API_V2_URL = 'https://api-v2.soundcloud.com';
const SOUNDCLOUD_SOURCE_ID = 'soundcloud';
const SOUNDCLOUD_TRACK_PREFIX = `${SOUNDCLOUD_SOURCE_ID}:`;
const DEFAULT_TIMEOUT_MS = 8000;

interface SoundCloudUser {
  id: number | string;
  username: string;
  avatar_url?: string | null;
}

interface SoundCloudTranscoding {
  url: string;
  preset: string;
  format: {
    protocol: string;
    mime_type: string;
  };
}

interface SoundCloudApiTrack {
  id: number | string;
  title: string;
  duration?: number;
  artwork_url?: string | null;
  permalink_url?: string;
  policy?: string;
  streamable?: boolean;
  track_authorization?: string;
  user: SoundCloudUser;
  media?: {
    transcodings?: SoundCloudTranscoding[];
  };
}

interface SoundCloudSearchResponse {
  collection?: SoundCloudApiTrack[];
}

interface SoundCloudResolvedStream {
  url: string;
}

export interface SoundCloudTrack extends SpiceTrack {
  permalinkUrl?: string;
  previewOnly?: boolean;
}

export interface SoundCloudStreamVariant {
  url: string;
  codec: string;
  bitrate: number;
  container: string;
  itag: number;
  preset: string;
  protocol: string;
  mimeType: string;
  previewOnly: boolean;
}

export interface SoundCloudTrackDetails {
  track: SoundCloudTrack;
  streams: SoundCloudStreamVariant[];
}

let clientIdPromise: Promise<string> | undefined;

export async function searchSoundCloudTracks(query: string, limit: number) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: '0',
  });
  const data = await soundCloudFetchJson<SoundCloudSearchResponse>(
    `/search/tracks?${params.toString()}`,
  );

  return (data.collection ?? [])
    .filter((track) => track.streamable !== false && track.policy !== 'BLOCK' && track.policy !== 'SNIP')
    .map(soundCloudTrackToSpiceTrack)
    .slice(0, limit);
}

export async function getSoundCloudTrackMetadata(id: string) {
  const rawId = stripSoundCloudTrackPrefix(id);
  const track = await soundCloudFetchJson<SoundCloudApiTrack>(`/tracks/${encodeURIComponent(rawId)}`);
  return soundCloudTrackToSpiceTrack(track);
}

export async function getSoundCloudTrackDetails(
  id: string,
  quality: 'high' | 'standard' | 'low' = 'standard',
): Promise<SoundCloudTrackDetails> {
  const rawId = stripSoundCloudTrackPrefix(id);
  const track = await soundCloudFetchJson<SoundCloudApiTrack>(`/tracks/${encodeURIComponent(rawId)}`);

  if (track.streamable === false) {
    throw new Error('This SoundCloud track is not streamable.');
  }
  if (track.policy === 'BLOCK') {
    throw new Error('This SoundCloud track is blocked in the current region.');
  }
  if (track.policy === 'SNIP') {
    throw new Error('SoundCloud only exposes a preview for this track, so SPICE hides it from full-song playback.');
  }

  const transcodings = track.media?.transcodings ?? [];
  const streams = (
    await Promise.all(
      transcodings
        .filter((transcoding) => !transcoding.format.protocol.includes('encrypted'))
        .map((transcoding, index) => resolveTranscoding(track, transcoding, index)),
    )
  )
    .filter((stream): stream is SoundCloudStreamVariant => stream !== null)
    .sort((a, b) => compareStreams(a, b, quality));

  if (streams.length === 0) {
    throw new Error('No compatible SoundCloud stream formats were discovered.');
  }

  return {
    track: soundCloudTrackToSpiceTrack(track),
    streams,
  };
}

export function stripSoundCloudTrackPrefix(id: string) {
  return id.startsWith(SOUNDCLOUD_TRACK_PREFIX)
    ? id.slice(SOUNDCLOUD_TRACK_PREFIX.length)
    : id;
}

async function resolveTranscoding(
  track: SoundCloudApiTrack,
  transcoding: SoundCloudTranscoding,
  index: number,
): Promise<SoundCloudStreamVariant | null> {
  try {
    const params = new URLSearchParams();
    if (track.track_authorization) {
      params.set('track_authorization', track.track_authorization);
    }
    const resolved = await soundCloudFetchJson<SoundCloudResolvedStream>(
      `${transcoding.url}?${params.toString()}`,
    );
    if (!resolved.url) return null;

    const preset = transcoding.preset || 'unknown';
    return {
      url: resolved.url,
      codec: codecForPreset(preset),
      bitrate: bitrateForPreset(preset),
      container: containerForMimeType(transcoding.format.mime_type),
      itag: index + 1,
      preset,
      protocol: transcoding.format.protocol,
      mimeType: transcoding.format.mime_type,
      previewOnly: track.policy === 'SNIP',
    };
  } catch {
    return null;
  }
}

function soundCloudTrackToSpiceTrack(track: SoundCloudApiTrack): SoundCloudTrack {
  const artist: SpiceArtist = {
    id: `${SOUNDCLOUD_SOURCE_ID}:user:${track.user.id}`,
    name: track.user.username || 'SoundCloud Artist',
    artworkUrl: bestArtworkUrl(track.user.avatar_url),
  };

  return {
    sourceId: SOUNDCLOUD_SOURCE_ID,
    id: `${SOUNDCLOUD_TRACK_PREFIX}${track.id}`,
    title: track.title || 'SoundCloud Track',
    artists: [artist],
    durationMs: track.duration,
    artworkUrl: bestArtworkUrl(track.artwork_url ?? track.user.avatar_url),
    permalinkUrl: track.permalink_url,
    previewOnly: track.policy === 'SNIP',
  };
}

async function soundCloudFetchJson<T>(pathOrUrl: string, retry = true): Promise<T> {
  const clientId = await getSoundCloudClientId();
  const url = new URL(pathOrUrl, SOUNDCLOUD_API_V2_URL);
  url.searchParams.set('client_id', clientId);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'SPICE-Music-Player/1.0' },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (retry && !process.env.SOUNDCLOUD_CLIENT_ID && (response.status === 401 || response.status === 403)) {
      clientIdPromise = undefined;
      return soundCloudFetchJson<T>(pathOrUrl, false);
    }
    throw new Error(`SoundCloud API request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function getSoundCloudClientId() {
  const configured = process.env.SOUNDCLOUD_CLIENT_ID?.trim();
  if (configured) return configured;

  clientIdPromise ??= discoverSoundCloudClientId();
  return clientIdPromise;
}

async function discoverSoundCloudClientId() {
  const homepage = await fetch('https://soundcloud.com', {
    headers: { 'User-Agent': 'SPICE-Music-Player/1.0' },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!homepage.ok) {
    throw new Error(`SoundCloud homepage request failed with status ${homepage.status}.`);
  }

  const html = await homepage.text();
  const assetUrls = Array.from(
    html.matchAll(/<script[^>]+src="([^"]*sndcdn\.com\/assets\/[^"]+\.js)"/g),
    (match) => match[1],
  ).reverse();

  for (const assetUrl of assetUrls) {
    try {
      const response = await fetch(assetUrl, {
        headers: {
          Range: 'bytes=0-50000',
          'User-Agent': 'SPICE-Music-Player/1.0',
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!response.ok) continue;

      const asset = await response.text();
      const match = asset.match(/,client_id:"([^"]+)"/);
      if (match?.[1]) return match[1];
    } catch {
      // Keep scanning the remaining SoundCloud frontend bundles.
    }
  }

  throw new Error('Could not discover the SoundCloud web client ID. Set SOUNDCLOUD_CLIENT_ID explicitly.');
}

function bestArtworkUrl(url: string | null | undefined) {
  if (!url) return undefined;
  return url.replace('-large.', '-t500x500.');
}

function codecForPreset(preset: string) {
  if (preset.includes('aac')) return 'mp4a.40.2';
  if (preset.includes('opus')) return 'opus';
  if (preset.includes('mp3')) return 'mp3';
  return preset;
}

function bitrateForPreset(preset: string) {
  const bitrate = preset.match(/(\d+)k/)?.[1];
  if (bitrate) return Number(bitrate) * 1000;
  if (preset.includes('opus')) return 64000;
  if (preset.includes('mp3')) return 128000;
  return 0;
}

function containerForMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'unknown';
}

function compareStreams(
  a: SoundCloudStreamVariant,
  b: SoundCloudStreamVariant,
  quality: 'high' | 'standard' | 'low',
) {
  const aProgressive = a.protocol === 'progressive';
  const bProgressive = b.protocol === 'progressive';
  if (aProgressive !== bProgressive) return aProgressive ? -1 : 1;
  return quality === 'low' ? a.bitrate - b.bitrate : b.bitrate - a.bitrate;
}
